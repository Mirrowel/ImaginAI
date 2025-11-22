# API Documentation

This document provides an outline of the available API endpoints and their uses.

## Scenarios

*   **`GET /api/scenarios/`**
    *   **Use:** Retrieves a list of all available scenarios.
    *   **Returns:** A JSON array of scenario objects.
*   **`GET /api/scenarios/{id}/`**
    *   **Use:** Retrieves a single scenario by its ID.
    *   **Returns:** A JSON object representing the scenario.
*   **`POST /api/scenarios/`**
    *   **Use:** Creates a new scenario.
    *   **Returns:** A JSON object representing the newly created scenario.
*   **`PUT /api/scenarios/{id}/`**
    *   **Use:** Updates an existing scenario by its ID.
    *   **Returns:** A JSON object representing the updated scenario.
*   **`DELETE /api/scenarios/{id}/`**
    *   **Use:** Deletes a scenario by its ID.
    *   **Returns:** A `204 No Content` response on success.

## Adventures

*   **`GET /api/adventures/`**
    *   **Use:** Retrieves a list of all available adventures.
    *   **Returns:** A JSON array of adventure objects.
*   **`GET /api/adventures/{id}/`**
    *   **Use:** Retrieves a single adventure by its ID.
    *   **Returns:** A JSON object representing the adventure.
*   **`POST /api/adventures/`**
    *   **Use:** Creates a new adventure.
    *   **Returns:** A JSON object representing the newly created adventure.
*   **`PUT /api/adventures/{id}/`**
    *   **Use:** Updates an existing adventure by its ID.
    *   **Returns:** A JSON object representing the updated adventure.
*   **`DELETE /api/adventures/{id}/`**
    *   **Use:** Deletes an adventure by its ID.
    *   **Returns:** A `204 No Content` response on success.

## AI Generation

*   **`POST /api/adventures/{id}/generate_ai_response/`**
    *   **Use:** Generates the next turn in an adventure based on the player's action.
    *   **Returns:** A JSON object containing the new turn.
*   **`POST /api/adventures/{id}/continue_ai/`**
    *   **Use:** Continues the story from the last model turn.
    *   **Returns:** A JSON object containing the new turn.
*   **`POST /api/adventures/{id}/retry_ai/`**
    *   **Use:** Retries the last model turn.
    *   **Returns:** A JSON object containing the new turn.

## AI Generation (Streaming)

*   **`POST /api/adventures/{id}/stream/`**
    *   **Use:** Generates AI response with real-time Server-Sent Events (SSE) streaming.
    *   **Request Body:**
        ```json
        {
            "text": "user input text or null for continue",
            "selected_model": "gemini/gemini-1.5-flash",
            "max_tokens": 200,
            "action_type": "do" | "say" | "story"
        }
        ```
    *   **Response:** `text/event-stream` with JSON chunks
        ```
        data: {"chunk": "AI response text..."}
        
        data: {"chunk": "more text..."}
        
        data: [DONE]
        ```
    *   **Error Format:**
        ```
        data: {"error": "error message"}
        ```
    *   **Headers:**
        - `Accept: text/event-stream`
        - `Content-Type: application/json`
    *   **Notes:** 
        - Creates user turn automatically if `text` is provided
        - Saves AI turn after stream completes
        - Supports cancellation via AbortController
        - Updates adventure `lastPlayedAt` timestamp

## Global Settings

*   **`GET /api/settings/1/`**
    *   **Use:** Retrieves the global settings for the application.
    *   **Returns:** A JSON object representing the global settings.
*   **`PUT /api/settings/1/`**
    *   **Use:** Updates the global settings for the application.
    *   **Returns:** A JSON object representing the updated global settings.

## Model Info

*   **`GET /api/model-input-limits/`**
    *   **Use:** Retrieves a list of all available models and their input token limits.
    *   **Returns:** A JSON object where the keys are the model names and the values are the token limits.
*   **`GET /api/model-input-limits/{model_name}/`**
    *   **Use:** Retrieves the input token limit for a specific model.
    *   **Returns:** A JSON object with a `limit` key.
