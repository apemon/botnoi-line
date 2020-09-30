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

