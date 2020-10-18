import 'dotenv/config'

import express, {Request, Response} from 'express'
import bodyParser from 'body-parser'
import { generateDailySummaryFlex, lineMiddleware } from './line'
import { webhookHandler } from './webhook'
import { getUserByLineId, userUpdateLineIdHandler } from './user'
import {botnoiTrackFood, calculateCal, getFood, botnoiConfirmPredict, botnoiCorrectPredict} from './food'
import { RequestError } from '@line/bot-sdk'
import {pushMessageHandler,getContentHandler} from './util'
import moment from 'moment-timezone'

const {PORT = 8000} = process.env

function main() {
    const app = express()

    app.use(bodyParser.urlencoded({extended: true}))
    app.use(bodyParser.json())

    app.post('/webhook', webhookHandler)

    app.get('/user/updateLineId',userUpdateLineIdHandler)
    app.get('/user/query', async (req:Request, res:Response) => {
        const line_id = req.query.line_id?.toString() || ''
        const user = await getUserByLineId(line_id)
        return res.send(user)
    })

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
        try {
            const result = await getFood(food_name.toString())
            return res.send(result)
        } catch (err) {
            return res.status(400).send({
                err: 'Not Found'
            })
        }
    })

    app.get('/food/cal' , async (req:Request, res:Response) => {
        const line_id = req.query.line_id?.toString() || ''
        try {
            const result = await calculateCal(line_id, new Date())
            return res.send(result)
        } catch (err) {
            return res.status(400).send({
                err: 'Not Found'
            })
        }
    })

    app.get('/food/track', botnoiTrackFood)
    app.get('/food/predict/confirm', botnoiConfirmPredict)
    app.get('/food/predict/correct', botnoiCorrectPredict)

    app.get('/test', (req:Request,res:Response) => {
        const a = new Date()
        const b = moment(a).tz('Asia/Bangkok')
        console.log(b.add(b.utcOffset(), 'minute').toDate())
        return res.send()
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