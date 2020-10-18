export interface dailySummary {
    date:Date,
    bmr_cal:number,
    consume_cal:number,
    status_color:string,
    status_text:string,
    status_cal:number,
    foods?:foodConsume[]
}

export interface foodConsume {
    date:Date,
    food:string,
    cal:number
}