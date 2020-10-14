export interface foodPredict {
    line_id:string,
    image:string,
    predicted_food:string,
    predicted_prob:number,
    predicted_time:Date,
    user_correct:string,
    user_purpose_food?:string
}