import 'dotenv/config'
import moment from 'moment'
import {middleware, Client, FlexContainer, FlexComponent, FlexBox, FlexBubble} from '@line/bot-sdk'
import { dailySummary } from 'types/dailySummary'

// Retrieve LINE's channel access token and secret.
const {CHANNEL_ACCESS_TOKEN, CHANNEL_SECRET} = process.env

if (!CHANNEL_ACCESS_TOKEN || !CHANNEL_SECRET) {
  throw new Error('Channel Access Token is not present.')
}

const lineConfig = {
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
  channelSecret: CHANNEL_SECRET,
}

export function generateDailySummaryFlex(summary:dailySummary):FlexContainer {
  let personal_flex:FlexBox
  if(summary.bmr_cal > 0) {
    personal_flex = {
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      contents: [
        {
          type:'box',
          layout:'horizontal',
          margin: 'md',
          contents: [
            {
              color: '#555555',
              flex: 0,
              size: 'md',
              text: 'ปริมาณพลังงานที่เหมาะสม',
              type: 'text'
            },{
              align: 'end',
              color: '#111111',
              size: 'md',
              text: `${summary.bmr_cal} kcal`,
              type: 'text'
            }
          ]  
        },{
          type:'box',
          layout:'horizontal',
          margin: 'md',
          contents: [
            {
              color: '#555555',
              flex: 0,
              size: 'md',
              text: 'ปริมาณพลังงานที่บริโภค',
              type: 'text'
            },{
              align: 'end',
              color: '#111111',
              size: 'md',
              text: `${summary.consume_cal} kcal`,
              type: 'text'
            }
          ]  
        },{
          type:'box',
          layout:'horizontal',
          margin: 'md',
          contents: [
            {
              color: `${summary.status_color}`,
              flex: 0,
              size: 'md',
              text: `${summary.status_text}`,
              type: 'text',
              weight: 'bold'
            },{
              align: 'end',
              color: `${summary.status_color}`,
              size: 'md',
              text: `${summary.status_cal} kcal`,
              type: 'text',
              weight: 'bold'
            }
          ]  
        }
      ]
    }
  } else {
    personal_flex = {
      type: 'box',
      layout: 'vertical',
      margin: 'md',
      contents: [
        {
          type:'box',
          layout:'horizontal',
          margin: 'md',
          contents: [
            {
              color: '#555555',
              flex: 0,
              size: 'md',
              text: 'ปริมาณพลังงานที่บริโภค',
              type: 'text'
            },{
              align: 'end',
              color: '#111111',
              size: 'md',
              text: `${summary.consume_cal} kcal`,
              type: 'text'
            }
          ]  
        }
      ]  
    }
  }
  
  let flex:FlexBubble = {
    type:'bubble',
    body: {
      layout: 'vertical',
      type: 'box',
      contents: [
        {
          size:'xl',
          text:'สรุปประจำวัน',
          type:'text',
          weight: 'bold'
        },{
          color: '#aaaaaa',
          size: 'md',
          text: moment(summary.date).locale('th').local().format('LLL'),
          type: 'text'
        },{
          margin:'xxl',
          type: 'separator'
        },
        personal_flex
        ,{
          type:'separator',
          margin: 'lg'
        },{
          type:'box',
          layout:'vertical',
          margin: 'md',
          contents: [
            {
              type:'text',
              text:'รายการอาหาร'
            }
          ]
        }
      ]
    },
    styles: {
      footer: {
        separator: true
      }
    }
  }
  summary.foods?.forEach(consume => {
    let consume_flex:FlexBox = {
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          wrap: true,
          color: '#555555',
          flex: 2,
          align: 'center',
          text: `${moment(consume.date).format('LT')}`
        },{
          type: 'text',
          wrap: true,
          color: '#555555',
          flex: 3,
          align: 'start',
          text: `${consume.food}`
        },{
          type: 'text',
          wrap: true,
          color: '#555555',
          flex: 3,
          align: 'end',
          text: `${consume.cal} kcal`
        }
      ]
    }
    flex.body?.contents.push(consume_flex)
  })
  return flex
}

export const lineMiddleware = middleware(lineConfig)
export const client = new Client(lineConfig)