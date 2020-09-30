import 'dotenv/config'
import Airtable from 'airtable'

const {AIRTABLE_APIKEY, AIRTABLE_BASEID} = process.env

if (!AIRTABLE_APIKEY || !AIRTABLE_BASEID) {
    throw new Error('Airtable config is not present.')
}

export const client = new Airtable({
  apiKey: AIRTABLE_APIKEY
}).base(AIRTABLE_BASEID)