import 'dotenv/config'

import express, {Request, Response} from 'express'
import bodyParser from 'body-parser'
import { lineMiddleware } from './line'
import { webhookHandler } from './webhook'
import { userUpdateLineIdHandler } from './user'
import {get_cal} from './food'
import { RequestError } from '@line/bot-sdk'
import {pushMessageHandler,getContentHandler} from './util'

const {PORT = 8000} = process.env

function main() {
    const app = express()

    app.use(bodyParser.urlencoded({extended: true}))
    app.use(bodyParser.json())

    app.post('/webhook', webhookHandler)

    app.get('/user/updateLineId',userUpdateLineIdHandler)

    app.post('/util/push', pushMessageHandler)
    app.get('/util/content/:id', getContentHandler)

    app.get('/ping', (req:Request, res:Response) => {
        res.send({
            msg: 'hello world ' + req.query.food_name?.toString()
        })
    })

    app.post('/dialog', (req:Request, res:Response) => {
        console.log(req.body)
        return res.send()
    })

    app.get('/', (_req:Request, res:Response) => {
        return res.send('hello world')
    })

    app.get('/food' , async (req:Request, res:Response) => {
        const food_name = req.query.food_name || ''
        console.log(food_name)
        return res.send(await get_cal(food_name.toString()))
    })

    app.listen(PORT, () => {
        console.log(`Server started at 0.0.0.0:${PORT}`)
    })
}

try {
    main()
} catch (error) {
    console.error('Fatal Error:', error.message)
}