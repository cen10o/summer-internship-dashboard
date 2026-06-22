import { getSurveyData } from "@/app/lib/sheets";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai"; 

// the columns of the open-ended questions from each survey tab.
const openEndedCols = {
    preInternCols : ['H', 'I', 'J'], 
    preMentorCols : ['AC', 'AD', 'AE', 'AF'],
    orientationCols : ['I', 'N'],
    scavengerHuntCols : ['O', 'P', 'Q', 'R'],
    authenticityAndProfessionalismCols: ['O', 'P', 'Q', 'R'],
    informationalInterviewsCols: ['O', 'P', 'Q', 'R'],
    buidlingBrandCols: ['O', 'P', 'Q', 'R'],
    funBusCols : ['H', 'I', 'J'],
    postInternCols : ['Q', 'R', 'S', 'T'],
    postMentorCols : ['Y', 'Z', 'AA', 'AB', 'AC', 'AD']
}

/**
 * Converts each open-ended column letter into an index.
 * @param col -- the column letter from the spreadsheet
 * @returns -- the column letter converted to a number/position
 */
function columnToIndex(col: string): number  {
    
    // since spreadsheets begin at 'A', 'A' corresponds to column 0 and so forth
    let result = 0

    // loop through each letter in the column to calculate the letter's alphabetical position
    for (let i = 0; i < col.length; i++) {
        result = result * 26 + (col.charCodeAt(i) - 65 + 1)
    }

    // subtract 1 from the result to get the column position in the spreadsheet.
    return result - 1
}

/**
 * Skim through the survey data to pull the open-ended responses from the survey.
 * @param rows -- the survey responses
 * @param cols -- the columns of open-ended responses from the spreadsheet
 * @returns -- a string containing the open-ended responses from the spreadsheet
 */
function extractOpenEndedResponses(rows: string[][], cols: string[]): string[] {

    // the array of open-ended responses 
    const results : string[] = []

    // map the open-ended columns to row positions
    const indicies = cols.map(col => columnToIndex(col))

    // loop through each row in the survey, skip row 1 because its a header row
    for (let i = 1; i < rows.length; i++) {

        const row = rows[i]

        // loop through each open-ended column and put the responses into the results array
        for (const index of indicies) {
            if (row[index] && row[index].trim() !== '') {
                results.push(row[index])
            }
        }
    }

    return results
}

async function identifyOpenEndedThemes(responses: string[], tabName: string): Promise<string> {
    
    const gemini = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

    const prompt = `Below are the following responses from ${tabName} survey, identify the top recurring themes and provide a short summary for each one.
    
    ${responses.join('\n')}`

    const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    })

    return response.text ?? "Nothing returned"
}

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

    // extract open-ended responses from each survey
    const preInternResponses = extractOpenEndedResponses(preInternshipData ?? [], openEndedCols.preInternCols)
    const preMentorResponses = extractOpenEndedResponses(preMentorData ?? [], openEndedCols.preMentorCols)
    const orientationReponses = extractOpenEndedResponses(orientationData ?? [], openEndedCols.orientationCols)
    const scavengerHuntResponses = extractOpenEndedResponses(scavengerHuntData ?? [], openEndedCols.scavengerHuntCols)
    const authenticityAndProfessionalismResponses = extractOpenEndedResponses(authenticityAndProfessionalismData ?? [], openEndedCols.authenticityAndProfessionalismCols)
    const informationalInterviewsResponses = extractOpenEndedResponses(informationalInterviewsData ?? [], openEndedCols.informationalInterviewsCols)
    const funbusResponses = extractOpenEndedResponses(funBusData ?? [], openEndedCols.funBusCols)
    const buildingBrandResponses = extractOpenEndedResponses(buildingBrandData ?? [], openEndedCols.buidlingBrandCols)
    const postInternResponses = extractOpenEndedResponses(postInternshipData ?? [], openEndedCols.postInternCols)
    const postMentorResponses = extractOpenEndedResponses(postMentorData ?? [], openEndedCols.postMentorCols)

    // use gemini to identify the top common themes for each survey
    const preInternThemes = await identifyOpenEndedThemes(preInternResponses, 'Pre-Internship')
    const preMentorThemes = await identifyOpenEndedThemes(preMentorResponses, 'Pre-Mentor')
    const orientationThemes = await identifyOpenEndedThemes(orientationReponses, 'Orientation')
    const scavengerHuntThemes = await identifyOpenEndedThemes(scavengerHuntResponses, 'Scavenger Hunt')
    const authenticityAndProfessionalismThemes = await identifyOpenEndedThemes(authenticityAndProfessionalismResponses, 'Authenticity & Professionalism')
    const informationalInterviewsThemes = await identifyOpenEndedThemes(informationalInterviewsResponses, 'Informational Interviews')
    const funBusThemes = await identifyOpenEndedThemes(funbusResponses, 'Fun Bus')
    const buildingBrandThemes = await identifyOpenEndedThemes(buildingBrandResponses, 'Building Brand')
    const postInternThemes = await identifyOpenEndedThemes(postInternResponses, 'Post-Internship')
    const postMentorThemes = await identifyOpenEndedThemes(postMentorResponses, 'Post-Mentor')


    // combines all the row data and themes into a json object and returns it to the browser
    return Response.json({
        preInternship: {data: preInternshipData, themes: preInternThemes},
        preMentor: { data: preMentorData, themes: preMentorThemes},
        orientation: { data: orientationData, themes: orientationThemes },
        scavengerHunt: { data: scavengerHuntData, themes: scavengerHuntThemes},
        authenticityAndProfessionalism: { data: authenticityAndProfessionalismData, themes: authenticityAndProfessionalismThemes},
        informationalInterviews: { data: informationalInterviewsData, themes: informationalInterviewsThemes },
        funBus: {data: funBusData, themes: funBusThemes},
        buildingBrand: { data: buildingBrandData, themes: buildingBrandThemes},
        postInternship: { data: postInternshipData, themes: postInternThemes},
        postMentor: {data: postMentorData, themes: postMentorThemes}
    })
}
