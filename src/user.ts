import 'dotenv/config'
import {Request, Response} from 'express'
import { calculateBMR } from './food'
import { userProfile } from 'types/userProfile'
import {client} from './airtable_client'

function _constructQuery(q:string, type:string = 'line', checkLine:boolean = false): string {
    if(checkLine) {
        if(type == 'username')
            return `AND(UserName = '${q}', LineUserId = '')`
    } else {
        if(type == 'line')
            return `LineUserId = '${q}'`
        else if(type == 'username')
            return `UserName = '${q}'`
    }
    return ''
}

export async function getRawUser(query:string) {
    const lists = await client('Profile').select({
        filterByFormula: query
    })
    const rows = await lists.all()
    if(rows.length != 1)
        return null
    // construct userprofile object
    const data = rows[0]
    return data
}

function convertToUserProfile(data:any): userProfile | null {
    if(data == null)
        return null
    const activity = data.fields['Activity'][0]
    const user:userProfile = {
        id: data.id,
        username: data.fields['UserName'],
        gender: data.fields['Gender'],
        age: data.fields['Age'],
        weight: data.fields['Weight'],
        height: data.fields['Height'],
        activity: activity,
        line_id: data.fields['LineUserId'],
        bmr: calculateBMR(data.fields['Gender'], data.fields['Age'], data.fields['Weight'], data.fields['Height'], activity)
    }
    return user
}

export async function getUser(query:string): Promise<userProfile | null> {
    const data = await getRawUser(query)
    if(data == null)
        return null
    const user = convertToUserProfile(data)
    return user
}

export async function getUserByLineId(line_id:string) {
    const query = _constructQuery(line_id)
    return await getUser(query)
}

export async function userUpdateLineIdHandler(req:Request, res:Response) {
    const q = req.query.q?.toString() || ''
    const line_id = req.query.customer_id?.toString() || ''
    const query = _constructQuery(q, 'username', true)
    try {
        const data = await getRawUser(query)
        if(data == null)
        return res.send({
            status: 'not found'
        })
        data.fields['LineUserId'] = line_id
        data.updateFields({
            LineUserId: line_id
        })
        const user = convertToUserProfile(data)
        if(user == null)
        return res.send({
            status: 'not found'
        })
        console.log(user.activity)
        return res.send({
            status: 'success',
            id: user.id,
            bmr: user.bmr
        })
    } catch(err) {
        console.log(err)
        return res.sendStatus(400)
    }
}