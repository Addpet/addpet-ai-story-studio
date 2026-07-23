exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  try {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({
          error: "Method not allowed. Please use POST."
        })
      };
    }

    // Check API key
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "OPENAI_API_KEY is missing from Netlify environment variables."
        })
      };
    }

    // Read request body
    let requestData;

    try {
      requestData = JSON.parse(event.body || "{}");
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid request data."
        })
      };
    }

    const {
      idea,
      genre = "Drama",
      format = "9:16 Vertical",
      style = "Cinematic Realism"
    } = requestData;

    if (!idea || !idea.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Please enter a story idea."
        })
      };
    }

    const prompt = `
You are the creative AI story engine for Addpet Story Studio.

Create an original, engaging story suitable for a short cinematic AI video.

STORY IDEA:
${idea}

GENRE:
${genre}

VIDEO FORMAT:
${format}

VISUAL STYLE:
${style}

Create the following:

1. TITLE
2. LOGLINE
3. STORY SYNOPSIS
4. MAIN CHARACTERS
   - Name
   - Age
   - Appearance
   - Personality
   - Clothing
5. FULL STORY
   - Beginning
   - Middle
   - Ending
6. SCENE-BY-SCENE BREAKDOWN
   Create 8 scenes.
   For each scene include:
   - Scene number
   - Location
   - Visual action
   - Character emotions
   - Dialogue
   - Voice-over narration
   - AI image/video prompt
7. FINAL MESSAGE OR MORAL

Keep all characters visually consistent throughout the scenes.
Make the story emotional, engaging, family-friendly, and suitable for ${format} video.
`;

    // Call OpenAI
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: prompt
        })
      }
    );

    // Read OpenAI response as text first
    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "OpenAI returned an invalid response.",
          details: responseText.substring(0, 500)
        })
      };
    }

    // Handle OpenAI errors
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error:
            data?.error?.message ||
            "OpenAI API request failed."
        })
      };
    }

    // Extract generated text
    let story = data.output_text || "";

    if (!story && data.output) {
      story = data.output
        .flatMap(item => item.content || [])
        .map(item => item.text || "")
        .filter(Boolean)
        .join("\n");
    }

    if (!story) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "The AI returned an empty story."
        })
      };
    }

    // Return successful response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        story
      })
    };

  } catch (error) {
    console.error("Function error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Server error: " + error.message
      })
    };
  }
};
