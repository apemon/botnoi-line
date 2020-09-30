import 'dotenv/config'
import axios from 'axios'
import {Request, Response} from 'express'
import {WebhookRequestBody, Group, WebhookEvent} from '@line/bot-sdk'
import {client} from './line'
import { pushMessageRequest } from 'types/pushMessageRequest'

export async function pushMessageHandler(req:Request, res:Response) {
    const request = req.body as pushMessageRequest
    await client.pushMessage(request.user_id, {
        type:'text',
        text:request.msg
    })
    return res.sendStatus(204)
}

