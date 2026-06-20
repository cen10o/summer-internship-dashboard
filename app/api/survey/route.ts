import { getSurveyData } from "@/app/lib/sheets";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";

/**
 * Processes a GET request and transforms survey data into a JSON object
 * @param request -- browser HTTP request
 * @returns -- a JSON object containing the survey data of the master sheet.
 */
export async function GET(request: NextRequest) {
    
    // extracts query parameters from the request URL
    const { searchParams } = new URL(request.url)

    // pulls the year from the query parameters
    const year = searchParams.get('year')
    if (!year) {
        return Response.json({ error: 'Year parameter is required'}, {status: 404})
    }

    // creates a redis client using credentials from env
    const redis = Redis.fromEnv()

    // looks up the spreadsheet ID om Redis using year as the key
    const spreadsheetId = await redis.get(year)
    if (!spreadsheetId) {
        return Response.json({ error: 'No sheet found for this year'}, {status: 404})
    }

    // fetches all the row data for each survey
    const preInternshipData = await getSurveyData(spreadsheetId, 'Summer Internship Survey (Pre)')
    const preMentorData = await getSurveyData(spreadsheetId, 'Mentor Survey Pre')
    const orientationData = await getSurveyData(spreadsheetId, 'Orientation Feedback')
    const scavengerHuntData = await getSurveyData(spreadsheetId, 'Scavenger Hunt')
    const authenticityAndProfessionalismData = await getSurveyData(spreadsheetId, 'Autheticity & Professionalism')
    const informationalInterviewsData = await getSurveyData (spreadsheetId, 'Informational Interviews')
    const funBusData = await getSurveyData(spreadsheetId, 'Summer Intern Fun Bus')
    const buildingBrandData = await getSurveyData(spreadsheetId, "Building Brand")
    const postInternshipData = await getSurveyData(spreadsheetId, "Summer Internship Survey (Post)")
    const postMentorData = await getSurveyData(spreadsheetId, 'Mentor Survey (Post)')

    // combines all the row data into a JSONject and returns it to the browser
    return Response.json({
        preInternship: preInternshipData,
        preMentor: preMentorData,
        orientation: orientationData,
        scavengerHunt: scavengerHuntData,
        authenticityAndProfessionalism: authenticityAndProfessionalismData,
        informationalInterviews: informationalInterviewsData,
        funBus: funBusData,
        buildingBrand: buildingBrandData,
        postInternship: postInternshipData,
        postMentor: postMentorData
    })
}
