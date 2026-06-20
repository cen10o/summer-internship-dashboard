import { google } from 'googleapis'

/**
 * Retrieves data from a specific tab in a Google Sheet
 * @param spreadsheetId -- the ID of the master sheet
 * @param tab -- the name of the survey tab
 * @param range -- the column range to fetch survey responses
 * @returns -- the survey responses of the tab
 */

export async function getSurveyData(spreadsheetId, tab, range) {

    // creates a Google authentication object thats scoped for only reading Google sheets
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    })

    // creates a version 4 Google Sheets API client that's authorized to access Google sheets
    const sheets = google.sheets({ version: 'v4', auth })

    // creates a response that contains requested survey data from the Google sheet.
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `${tab}!${range}`
    })

    // returns row data of the request survey.
    return response.data.values
}

