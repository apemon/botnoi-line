import 'dotenv/config'
import axios from 'axios'
import e, {Request, Response} from 'express'
import {WebhookRequestBody, Group, WebhookEvent, Message} from '@line/bot-sdk'
import {client} from './line'
import { foodSession } from 'types/foodSession'
import {upload,predict} from './food'

const {BOTNOI_WEBHOOK} = process.env

if (!BOTNOI_WEBHOOK) {
    throw new Error('Botnoi webhook is not present.')
}

let food_sessions:Map<string, foodSession> = new Map<string, foodSession>()

export async function webhookHandler(req:Request, res:Response) {
    try {
        const {events} = req.body as WebhookRequestBody
        events.forEach(async evt => {
            console.log(evt)
            if(evt.type == 'message' && evt.source.type == 'user') {
                const userId = evt.source.userId || ''
                if(evt.message.type == 'sticker') {
                    await client.pushMessage(userId, {
                        type:'text',
                        text:`สติ๊กเกอร์น่ารัก`
                    })
                } else if(evt.message.type == 'text') {
                    // do something and push to botnoi platform
                    if(evt.message.text == 'คำนวณแคล') {
                        await client.replyMessage(evt.replyToken, {
                            type: 'text',
                            text: 'รบกวนช่วยใส่ชื่อเมนูหรือถ่ายรูปอาหารด้วยครับ'
                        })
                        food_sessions.set(userId, {
                            user_id: userId,
                            timestamp: new Date()
                        })
                    } else {
                        if(food_sessions.get(userId)) {
                            await client.replyMessage(evt.replyToken, {
                                type: 'text',
                                text: `อาหารของคุณคือ ${evt.message.text}`
                            })
                            // need to get cal from table
                            food_sessions.delete(userId)
                        } else {
                            const result = await axios.post(BOTNOI_WEBHOOK || '', req.body)
                        }
                    }
                } else if(evt.message.type == 'image') {
                    if(food_sessions.get(userId)) {
                        // handle image
                            const url = await upload(evt.message.id)
                            console.log(url)
                        // handle predict
                            const predict_result = await predict(url)
                            console.log(predict_result)
                            await client.pushMessage(userId, {
                                type:'text',
                                text:`อาหารของคุณคือ ${predict_result.class} และมี ${predict_result.cal} cal`
                            })
                        // save result to airtable

                    }
                } else {
                    const result = await axios.post(BOTNOI_WEBHOOK || '', req.body)
                }
            } else {
                const result = await axios.post(BOTNOI_WEBHOOK || '', req.body)
            }
        })
        return res.send()
    } catch (err) {
        console.log(err)
    }
}