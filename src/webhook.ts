import 'dotenv/config'
import axios from 'axios'
import e, {Request, Response} from 'express'
import {WebhookRequestBody, Group, WebhookEvent, Message} from '@line/bot-sdk'
import {client} from './line'
import {upload,predict, botTrackFood, getFood, trackPredict} from './food'
import querystring from 'querystring'
import { foodPredict } from 'types/foodPredict'
import { DateTime } from 'luxon'
import NodeCache from 'node-cache'

const {BOTNOI_WEBHOOK} = process.env

if (!BOTNOI_WEBHOOK) {
    throw new Error('Botnoi webhook is not present.')
}

const prediction_cache = new NodeCache({stdTTL: 1800, checkperiod: 600})
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
                    // track food by sentence (ex. กินข้าวมันไก่ 1 จาน)
                    if(evt.message.text.substr(0,3) == 'กิน' || evt.message.text.substr(0,4) == 'ดื่ม') {
                        const text = evt.message.text.replace('กิน','').replace('ดื่ม', '')
                        const index = text.indexOf(' ') || 0
                        let food_name = ''
                        if(index != -1)
                            food_name = text.substr(0, text.indexOf(' ')).trim()
                        else
                            food_name = text.trim()
                        //@TODO add support for quantity
                        const msg = await botTrackFood(userId, food_name)
                        await client.replyMessage(evt.replyToken, {
                            type: 'text',
                            text: msg
                        })
                    } else {
                        const result = await axios.post(BOTNOI_WEBHOOK || '', req.body)
                    }
                } else if(evt.message.type == 'image') {
                    // handle image
                    const url = await upload(evt.message.id)
                    // handle predict
                    const predict_result = await predict(url)
                    console.log(predict_result)
                    const food = await getFood(predict_result.class)
                    let text = ''
                    if(food == null)
                        text = `ผมไม่สามารถทายเมนูอาหารจากรูปที่ได้มาครับ ต้องขออภัยด้วยครับ`
                    else
                        text = `อาหารของคุณคือ ${predict_result.class} และมี ${food.calories} cal`
                    // construct food prediction object
                    const food_predict:foodPredict = {
                        line_id:userId,
                        image: url,
                        predicted_food: predict_result.class,
                        predicted_prob: predict_result.probability,
                        predicted_time: new Date(),
                        user_correct: 'unconfirm'
                    }
                    await client.replyMessage(evt.replyToken, {
                        type: 'text',
                        text: text,
                        quickReply: {
                            items: [
                                {
                                    type:'action',
                                    action: {
                                        type: 'postback',
                                        label: 'ยืนยันผลถูกต้อง',
                                        displayText: 'ยืนยันผลถูกต้อง',
                                        data: `action=confirm_food_predict&image=${food_predict.image}&food=${food_predict.predicted_food}&prob=${food_predict.predicted_prob}&time=${food_predict.predicted_time}`
                                    }
                                },{
                                    type:'action',
                                    action: {
                                        type: 'postback',
                                        label: 'แก้ไขผลการทำนาย',
                                        displayText: 'แก้ไขผลการทำนาย',
                                        data: `action=correct_food_predict&image=${food_predict.image}&food=${food_predict.predicted_food}&prob=${food_predict.predicted_prob}&time=${food_predict.predicted_time}`
                                    }
                                }
                            ]
                        }
                    })
                    await trackPredict(food_predict)
                    // store id to cache
                } else {
                    const result = await axios.post(BOTNOI_WEBHOOK || '', req.body)
                }
            } else if(evt.type == 'postback') {
                if(evt.source.type == 'user') {
                    const userId = evt.source.userId
                    const qs = querystring.parse(evt.postback.data)
                    if(qs.action == 'confirm_food_predict') {
                        await client.replyMessage(evt.replyToken, {
                            type:'text',
                            text: `เย้ทายถูกด้วย ขอบคุณมากๆครับ`
                        })
                        // update to airtable
                    } else if(qs.action == 'correct_food_predict') {
                        await client.replyMessage(evt.replyToken, {
                            type:'text',
                            text: `กรุณาใส่ชื่อเมนูอาหารครับ`
                        })
                    } else {
                        const result = await axios.post(BOTNOI_WEBHOOK || '', req.body)
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