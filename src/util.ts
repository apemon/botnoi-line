import 'dotenv/config'
import axios from 'axios'
import {Request, Response} from 'express'
import {WebhookRequestBody, Group, WebhookEvent} from '@line/bot-sdk'
import {client} from './line'
import { pushMessageRequest } from 'types/pushMessageRequest'
import fs from 'fs'

export async function pushMessageHandler(req:Request, res:Response) {
    const request = req.body as pushMessageRequest
    await client.pushMessage(request.user_id, {
        type:'text',
        text:request.msg
    })
    return res.sendStatus(204)
}

export async function getContentHandler(req:Request, res:Response) {
    const msg_id = req.params.id
    try {
        const stream  = await client.getMessageContent(msg_id)
        let chunks:Uint8Array[] = []
        stream.on('data', chunk => {
            chunks.push(chunk)
        })
        stream.on('end', () => {
            const data = Buffer.concat(chunks)
            const result = data.toString('base64')
            return res.send(result)
        })
    } catch (err) {
        return res.status(400).send(err)
    }
}