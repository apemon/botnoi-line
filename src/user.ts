import 'dotenv/config'
import {Request, Response} from 'express'
import Airtable from 'airtable'

const {AIRTABLE_APIKEY, AIRTABLE_BASEID} = process.env

if (!AIRTABLE_APIKEY || !AIRTABLE_BASEID) {
    throw new Error('Airtable config is not present.')
}

const airtable = new Airtable({
    apiKey: AIRTABLE_APIKEY
}).base(AIRTABLE_BASEID)

function _constructQuery(q:string): string {
    console.log(q)
    const emailRegex = new RegExp('[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+')
    const mobileRegex = new RegExp('[0-9]{10}')
    //const mobileRegex = new RegExp('[(]{1}[0-9]{3}[)]{1} [0-9]{3}-[0-9]{4}')
    const lineRegex = new RegExp('[u,U]{1}[0-9a-f]{32}')
    if(emailRegex.test(q))
        return `AND(Email = '${q}', LineUserID = '')`
    else if(lineRegex.test(q))
        return `LineUserId = '${q}'`
    else {
        q = q.replace(/[\s-]+/g,'')
        if(mobileRegex.test(q)) {
            // convert mobile number to airtable format
            const number = `(${q.substr(0,3)}) ${q.substr(3,3)}-${q.substr(6,4)}`
            return `AND(Mobile = '${number}', LineUserId = '')`
        }
        return ''
    }
}

export async function userUpdateLineIdHandler(req:Request, res:Response) {
    const q = req.query.q?.toString() || ''
    const line_id = req.query.customer_id?.toString() || ''
    const query = _constructQuery(q)
    console.log(query)
    try {
        const lists = await airtable('Profile').select({
            filterByFormula: query
        })
        const rows = await lists.all()
        if(rows.length != 1)
            return res.send({
                status: 'not found'
            })
        const data = rows[0]
        data.fields['LineUserId'] = line_id
        console.log(data.fields)
        data.updateFields({
            LineUserId: line_id
        })
        return res.send({
            status: 'success',
            id: data.id
        })
    } catch(err) {
        console.log(err)
        return res.sendStatus(400)
    }
}