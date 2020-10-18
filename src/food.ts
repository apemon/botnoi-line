import 'dotenv/config'
import {Request, Response} from 'express'
import {client as airtable, client} from './airtable_client'
import {client as line}  from './line'
import {getRawUser, getUserByLineId} from './user'
import axios from 'axios'
import { resolve } from 'path'
import { rejects } from 'assert'
import NodeCache from 'node-cache'
import { foodCal } from 'types/foodCal'
import { foodPredict } from 'types/foodPredict'
import { FlexMessage } from '@line/bot-sdk'
import moment from 'moment'
import { dailySummary, foodConsume } from 'types/dailySummary'

const {FOOD_PREDICT_API, FOOD_UPLOAD_API} = process.env

if (!FOOD_PREDICT_API || !FOOD_UPLOAD_API) {
    throw new Error('Food prediction api is not present.')
}

const food_cache = new NodeCache({stdTTL: 1800, checkperiod: 600})
const prediction_cache = new NodeCache({stdTTL: 1800, checkperiod: 600})

export async function upload(msg_id:string):Promise<string> {
    const wait :Promise<string> = new Promise(async (resolve, reject) => {
        try {
            const stream  = await line.getMessageContent(msg_id)
            let chunks:Uint8Array[] = []
            stream.on('data', chunk => {
                chunks.push(chunk)
            })
            stream.on('end', async () => {
                const data = Buffer.concat(chunks)
                const result = data.toString('base64')
                const response = await axios.post(FOOD_UPLOAD_API|| '', {
                    filename: msg_id,
                    img: result,
                    type: 'png'
                })
                resolve(response.data.url)
            })
        } catch (err) {
            console.log(err)
            reject(err)
        }
    })
    return wait
}

export async function predict(img:string) {
    try {
        const url = `${FOOD_PREDICT_API}?img=${img}`
        const response = await axios.get(url)
        return response.data
    } catch (err) {
        console.log(err)
    }
}

export async function getFood(food_name:string):Promise<foodCal|null> {
    const food_query = `Name = '${food_name.trim()}'`
    const lists = await client('FoodCal').select({
        filterByFormula: food_query
    })
    const rows = await lists.all()
    if(rows.length == 0)
        return null
    const data = rows[0]
    const food:foodCal = {
        name: data.fields['Name'],
        quantity: data.fields['Quantity'],
        unit: data.fields['Unit'],
        calories: data.fields['Calories'],
        image: data.fields['Image']
    }
    food_cache.set(food.name, food)
    return food
}

export function calculateBMR(gender:string, age:number, weight:number, height:number, activity:number) {
    // calculate base BMR
    let base_bmr = 0
    if (gender == 'ชาย')
        base_bmr = 66 + (13.67 * weight) + (5 * height) - (6.8 * age)
    else
        base_bmr = 655 + (9.59 * weight) + (1.85 * height) - (4.7 * age)
    // apply HARRIS BENEDICT FORMULA for simplify formula
    let multiplier = 1
    if(activity == 1)
        multiplier = 1.2
    else if(activity == 2)
        multiplier = 1.375
    else if(activity == 3)
        multiplier = 1.55
    else if(activity == 4)
        multiplier = 1.725
    else if(activity == 5)
        multiplier = 1.9
    return Math.round(base_bmr * multiplier)
}

export async function trackFood(line_id:string, food_name: string) {
    const food = await getFood(food_name)
    // track food
    try {
        let calories = 0
        if(food != null)
            calories = food.calories
        await client('FoodConSume').create([{
            "fields": {
                "LineUserId": line_id,
                "FoodName": food_name,
                "Calories": calories,
                "Date": moment().format('YYYY-MM-DD')
            }
        }])
        return food
    } catch (err) {
        console.log(err)
        throw err
    }
}

export async function getRawDailyConsume(line_id:string, date:Date) {
    const query = `AND(LineUserId = '${line_id}', IS_SAME({Date},'${moment(date).format('YYYY-MM-DD')}', 'day'))`
    const lists = await client('FoodConsume').select({
        filterByFormula: query,
        sort: [
            {
                field: 'Created',
                direction: 'asc'
            }
        ]
    })
    const rows = await lists.all()
    return rows
}

export async function getDailySummary(line_id:string, date:Date):Promise<dailySummary> {
    const offset = moment(date).tz('Asia/Bangkok').utcOffset()
    const utc_date = moment(date).add(offset, 'minute').toDate()
    const rows = await getRawDailyConsume(line_id, utc_date)
    const user = await getUserByLineId(line_id)
    let total_cal = 0
    let consumes:foodConsume[] = []
    rows.forEach(row => {
        const consume:foodConsume = {
            date: moment(row.fields['Created']).add(offset,'minute').toDate(),
            cal: row.fields['Calories'],
            food: row.fields['FoodName']
        }
        total_cal += consume.cal
        consumes.push(consume)
    })
    const bmr = user?.bmr || 0
    let status_text = 'เหลือ'
    let status_color = '#00ff00'
    let status_cal = Math.abs(total_cal - bmr)
    if(total_cal > bmr) {
        status_text = 'เกิน'
        status_color = '#ff4000'
    }
    let summary:dailySummary = {
        bmr_cal: user?.bmr || 0,
        consume_cal: total_cal,
        date: utc_date,
        foods: consumes,
        status_cal: status_cal,
        status_color: status_color,
        status_text: status_text
    }
    return summary
}

export async function calculateCal(line_id:string, date:Date):Promise<number> {
    const rows = await getRawDailyConsume(line_id, date)
    let total_cal = 0
    rows.forEach(row => {
        total_cal += row.fields['Calories']
    })
    return total_cal
}

export async function botTrackFood(line_id:string, food_name:string, repeat_food_cal:boolean = true) {
    const food = await trackFood(line_id, food_name)
    // construct message for bot response
    let msg = ''
    if(food == null)
        msg = `บันทึก ${food_name} เรียบร้อย เนื่องจากบอทไม่พบเมนูนี้ในฐานข้อมูล จึงยังไม่ได้คำนวณค่าแคลลอรี่ของเมนูนี้ ต้องขออภัยด้วยครับ`
    else {
        if(repeat_food_cal)
            msg = `${food_name} ให้พลังงาน ${food.calories} kcal บันทึกเรียบร้อยครับ `
        else
            msg = `บันทึกเรียบร้อยครับ `
        // calculate current & remaining cal for existing user
        const user = await getUserByLineId(line_id)
        if(user != null) {
            const total_cal = await calculateCal(line_id, new Date())
            const remaining_cal = user.bmr - total_cal
            msg += `โดยวันนี้คุณได้กินไปแล้ว ${total_cal} kcal `
            if(remaining_cal < 0)
                msg += `ซึ่งเกินค่าพลังงานที่ใช้ในแต่ละวันไปแล้ว ${Math.abs(remaining_cal)} kcal ครับ`
            else 
                msg += `ซึ่งสามารถกินได้อีก ${remaining_cal} kcal ครับ`
        }
    }
    return msg
}

export async function trackPredict(predict:foodPredict) {
    try {
        const results = await client('FoodPredict').create([{
            'fields': {
                'LineUserId': predict.line_id,
                'Image': predict.image,
                'Predicted_Food': predict.predicted_food,
                'Predicted_Prob': predict.predicted_prob,
                'Predicted_Time': moment(predict.predicted_time).toISOString(),
                'UserFeedback': predict.user_correct,
                'UserPurposeFood': predict.user_purpose_food?.toString()
            }
        }])
        const id = results[0].id
        prediction_cache.set(predict.line_id, id)
        return id
    } catch (err) {
        console.log(err)
        throw err
    }
}

export async function updatePredictionResult(line_id:string, result:boolean, user_purpose:string = '') {
    const id = prediction_cache.get(line_id)
    await client('FoodPredict').update([{
        id: id,
        fields: {
            UserFeedback: result?'true':'false',
            UserPurposeFood: user_purpose
        }
    }])
}

export async function botnoiTrackFood(req:Request, res:Response) {
    const line_id = req.query.customer_id?.toString() || ''
    const food_name = req.query.food_name?.toString() || ''
    try {
        const msg = await botTrackFood(line_id, food_name)
        return res.send({
            msg: msg
        })
    } catch (err) {
        console.log(err)
        return res.status(400).send({
            err:err
        })
    }
}

export async function botnoiConfirmPredict(req:Request, res:Response) {
    const line_id = req.query.customer_id?.toString() || ''
    try {
        await updatePredictionResult(line_id, true)
        return res.status(204).send()
    } catch (err) {
        console.log(err)
        return res.status(400).send({
            err:err
        }) 
    }
}

export async function botnoiCorrectPredict(req:Request, res:Response) {
    const line_id = req.query.customer_id?.toString() || ''
    const food_name = req.query.food_name?.toString() || ''
    try {
        await updatePredictionResult(line_id, false, food_name)
        return res.status(204).send()
    } catch (err) {
        console.log(err)
        return res.status(400).send({
            err:err
        }) 
    }
}