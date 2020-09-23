import 'dotenv/config'
import axios from 'axios'
import {Request, Response} from 'express'
import {WebhookRequestBody, Group, WebhookEvent} from '@line/bot-sdk'
import {client} from './line'

const {BOTNOI_WEBHOOK} = process.env

if (!BOTNOI_WEBHOOK) {
    throw new Error('Botnoi webhook is not present.')
  }

export async function webhookHandler(req:Request, res:Response) {
    try {
        const {events} = req.body as WebhookRequestBody
        events.forEach(async evt => {
            console.log(evt)
            if(evt.type == 'follow') {
                // greeting
                if(evt.source.type == 'user') {
                    const userId = evt.source.userId
                    const profile = await client.getProfile(userId)
                    const msg = `สวัสดี คุณ ${profile.displayName}
ผมเป็น bot เพื่อช่วยในการดูแลสุขภาพของคุณ`
                    await client.pushMessage(userId, {
                        type:'text',
                        text:msg
                    })
                    await client.pushMessage(userId, {
                        type:'text',
                        text:`หากคุณ ${profile.displayName} ยังไม่เคยได้ลงทะเบียน สามารถลงทะเบียนได้ที่ https://docs.google.com/forms/d/e/1FAIpQLSeSHYdOzgTE8P13TytGEvZ2O6j8Q9dsqKGi6L33I29nkdLgQg/viewform`
                    })
                }
            } else if(evt.type == 'message') {
                const userId = evt.source.userId || ''
                if(evt.message.type == 'sticker') {
                    await client.pushMessage(userId, {
                        type:'text',
                        text:`สติ๊กเกอร์น่ารัก`
                    })
                } else {
                    // do something and push to botnoi platform
                    const result = await axios.post(BOTNOI_WEBHOOK || '', req.body)
                }
            }
        })
        return res.send()
    } catch (err) {
        console.log(err)
    }
}