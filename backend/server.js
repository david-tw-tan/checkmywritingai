import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import { ESSAY_ANALYSIS_PROMPT_1, ESSAY_ANALYSIS_PROMPT_2_1, ESSAY_ANALYSIS_PROMPT_2_2, ESSAY_ANALYSIS_PROMPT_3, ESSAY_ANALYSIS_PROMPT_4 } from './prompts.js';
import path from 'path'; // Add this line
import { fileURLToPath } from 'url'; // Add this line too

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' })); // Increase JSON payload limit for base64 images
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from public directory (now moved inside backend folder)


// Only use proxy in development environment
let proxyAgent = null;
let proxyUrl = null;
if (process.env.NODE_ENV !== 'production') {
  proxyUrl = 'http://127.0.0.1:33210';
  proxyAgent = new HttpsProxyAgent(proxyUrl);
}


// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1", // Matches Python exactly
  timeout: 120000,
  maxRetries: 5,
  fetch: (url, init) => {
    console.log("Making request to:", url);

    const fetchOptions = {...init};
    if (proxyAgent) {
      console.log("Using proxy:", proxyUrl);
      fetchOptions.agent = proxyAgent;
    }

    return fetch(url, {
      ...fetchOptions,
      timeout: 60000
    });
  }
});


// New endpoint for the "Check My Writing Now" button, all file uploads handled by front end now
app.post('/api/check-writing', async (req, res) => {
  try {
    // Get base64 image data directly from request body
    const { imageData, mimeType } = req.body;
    if (!imageData || !mimeType) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // FIRST API CALL - Extract text from image
    console.log("\n=== Starting API Call #1: Text Extraction ===");
    const textExtraction = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: ESSAY_ANALYSIS_PROMPT_1 },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageData}`
            }
          }
        ]
      }],
      max_tokens: 1000,
      temperature: 0.7
    });

    // Clean up responses
    const cleanResponse = (text) => {
      return text
        .replace(/\n\s*\n/g, '\n')
        .replace(/\s*\n\s*/g, '\n')
        .trim();
    };

    const extractedText = cleanResponse(textExtraction.choices[0].message.content);
    console.log("\nAPI Response #1 (Extracted Text):");
    console.log(extractedText);

    // Check if the response contains "<NOT_WRITING_SAMPLE>", exit api endpoint if true
    if (extractedText.includes("<NOT_WRITING_SAMPLE>")) {
      return res.json({ error: "NOT_WRITING_SAMPLE" });
    }

    // Run API calls #2.1, #2.2, #3, and #4 in parallel
    console.log("\n=== Starting API Call #2.1, #2.2, #3 and #4 in parrallel: Grammar/Spelling Check, AI Assessment, Grammar Explain, Writing Tips ===");
    const [basicReview, aiAssessmentQuery, grammarRulesQuery, writingTipsQuery] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: ESSAY_ANALYSIS_PROMPT_2_1.replace('[Insert extracted text from API call 1 here]', extractedText)
        }],
        max_tokens: 1000,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: ESSAY_ANALYSIS_PROMPT_2_2.replace('[Insert extracted text from API call 1 here]', extractedText)
        }],
        max_tokens: 1000,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: ESSAY_ANALYSIS_PROMPT_3.replace('[Insert extracted text from API call 1 here]', extractedText)
        }],
        max_tokens: 1000,
        temperature: 0.7
      }),
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: ESSAY_ANALYSIS_PROMPT_4.replace('[Insert extracted text from API call 1 here]', extractedText)
        }],
        max_tokens: 1500,
        temperature: 0.7
      })
    ]);

   const basicReviewResponse = basicReview.choices[0].message.content;
   const aiAssessmentResponse = aiAssessmentQuery.choices[0].message.content;
   const GrammarRulesResponse = cleanResponse(grammarRulesQuery.choices[0].message.content);
   const writingTipsResponse = cleanResponse(writingTipsQuery.choices[0].message.content);

   console.log("\nAPI Response #2.1 (Basic Review):");
   console.log(basicReviewResponse);
   console.log("\nAPI Response #2.2 (AI Assessment):");
   console.log(aiAssessmentResponse);
   console.log("\nAPI Response #3 (Grammar Rules):");
   console.log(GrammarRulesResponse);
   console.log("\nAPI Response #3 (Level Up Tips):");
   console.log(writingTipsResponse);

   // Parse the sentence review items from writing tips

   // Parse Grammar Rules
   let grammarRulesItems = [];
   try {
     const cleanedResponse = GrammarRulesResponse // remove backticks + json
       .replace("```json", '')
       .replace("```", '')
       .trim();

     const parsedResponse = JSON.parse(cleanedResponse);
     if (parsedResponse.grammarReview) {
       grammarRulesItems = parsedResponse.grammarReview;
     }
   } catch (error) {
     console.error("Error parsing grammar rules JSON:", error);
     console.error("Response that failed to parse:", GrammarRulesResponse);
   }

   // Parse Writing Tips
   let writingTipsItems = [];
   try {
     const cleanedResponse = writingTipsResponse // remove backticks + json
       .replace("```json", '')
       .replace("```", '')
       .trim();

     const parsedResponse = JSON.parse(cleanedResponse);
     if (parsedResponse.writingTipsReview) {
       writingTipsItems = parsedResponse.writingTipsReview;
     }
   } catch (error) {
     console.error("Error parsing writing tips rules JSON:", error);
   }

    // Prepare the final response
    const result = {
      essayReview: basicReviewResponse,
      grammarReview: grammarRulesItems,
      writingTipsReview: writingTipsItems,
      aiAssessment: aiAssessmentResponse
    };


    console.log("\n=== All API calls completed successfully ===\n");
    res.json(result);

  } catch (error) {
    console.error('\n=== Error processing request ===');
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      network: error.cause?.code,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message
    });
  }
});

// New endpoint for "get revised essay"
app.post('/api/get-revised-essay', async (req, res) => {
  try {
    console.log("\n=== Starting API Call: Get Revised Essay ===");

    // Get the writing tips data from the request body
    const { writingTips } = req.body;

    if (!writingTips) {
      return res.status(400).json({ error: 'No writing tips data provided' });
    }

    const ai_query_raw = `
    Please refer to the following JSON data, which includes a sentence-by-sentence review of a student essay.

    Each entry in the JSON contains:
    * The "original" sentence.
    * An AI-generated "tip" for improvement.
    * A suggested "revised" sentence from AI.

    Using the provided "revised" sentences, reconstruct the essay in its entirety. When doing so, ensure the following:

    1. Flow & Transitions: Ensure that the revised sentences flow seamlessly together and transition naturally, maintaining coherence throughout the essay.

    2. Pacing: Focus on maintaining a balanced pacing. Avoid overly long or complex sentences; prefer short, clear sentences where appropriate to improve readability and comprehension.

    3. Tone & Style: Retain the original tone and writing style of the student. The final essay should not sound overly polished or AI-generated, but should instead reflect the student's voice and writing mannerisms.

    4. Paragraph Structure: Maintain the original paragraph structure. Each paragraph in the revised essay should correspond to a paragraph in the original text. Use double line breaks to separate paragraphs.

    Please output only the reformed essay, without any additional comments, explanations, or intros.

    JSON DATA:
    ${JSON.stringify(writingTips, null, 2)}
    `;

    const essayQuery = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: ai_query_raw
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const revisedEssay = essayQuery.choices[0].message.content;
    console.log("\nAPI Response (Revised Essay):");
    console.log(revisedEssay);

    res.json({ revisedEssay });
  } catch (error) {
    console.error('\n=== Error processing revised essay request ===');
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      network: error.cause?.code,
      stack: error.stack
    });

    res.status(500).json({
      error: 'Failed to process revised essay request',
      details: error.message
    });
  }
});


const port = process.env.PORT || 3000;

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });

// BELOW IS FOR TESTING ON LOCAL IPHONE

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});
