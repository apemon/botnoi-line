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
            const userId = evt.source.userId || ''
            const profile = await client.getProfile(userId)
            // do something and push to botnoi platform
            const result = await axios.post(BOTNOI_WEBHOOK || '', req.body)
            console.log(result.data)
            /*
            client.pushMessage(userId, {
                type: 'text',
                text: `hello ${profile.displayName}`
            })
            */
        })
        return res.send()
    } catch (err) {
        console.log(err)
    }
}