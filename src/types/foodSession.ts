export interface foodSession {
    user_id: string,
    image_url?: string,
    predicted_food?: string,
    predicted_prob?: number,
    timestamp: Date
}