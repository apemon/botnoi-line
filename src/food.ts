import 'dotenv/config'
import {Request, Response} from 'express'
import {client as airtable, client} from './airtable_client'
import {client as line}  from './line'
import axios from 'axios'
import { resolve } from 'path'
import { rejects } from 'assert'

const {FOOD_PREDICT_API, FOOD_UPLOAD_API} = process.env

if (!FOOD_PREDICT_API || !FOOD_UPLOAD_API) {
    throw new Error('Food prediction api is not present.')
}

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

export async function get_cal(food_name:string) {
    const food_query = `Name = '${food_name.trim()}'`
    const lists = await client('FoodCal').select
    ({
        filterByFormula: food_query
    })
    const rows = await lists.all()
    const data = rows[0]
    console.log(data.fields)
    return data.fields
}