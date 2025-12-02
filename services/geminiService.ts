import { GoogleGenAI } from "@google/genai";
import { EditMode, AgeDirection } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to strip the data:image/xyz;base64, prefix if present
const extractBase64Data = (base64String: string): string => {
  if (base64String.includes(',')) {
    return base64String.split(',')[1];
  }
  return base64String;
};

// Helper to determine mime type from base64 header or default to image/jpeg
const getMimeType = (base64String: string): string => {
  if (base64String.startsWith('data:')) {
    const match = base64String.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return 'image/jpeg';
};

export const generateEditedImage = async (
  base64Input: string,
  mode: EditMode,
  ageDirection?: AgeDirection,
  customPrompt?: string
): Promise<string> => {
  const model = "gemini-2.5-flash-image"; 
  
  let promptText = "";

  switch (mode) {
    case EditMode.RESTORE:
      promptText = "Restore this old photo to look like it was taken with a modern high-end camera. Fix any scratches, tears, dust, or noise. Sharpen details and improve clarity. Output a photorealistic result. If the image is B&W, keep it B&W unless colorization is requested.";
      break;
    case EditMode.ENHANCE:
      promptText = "Enhance this image to professional studio quality. Upscale resolution, sharpen fine details, denoise, and improve lighting and contrast. Make the image crisp, vibrant, and clear while preserving the original subject matter. High definition 4k output.";
      break;
    case EditMode.COLORIZE:
      promptText = "Colorize this black and white photo. Use natural, realistic colors for skin tones, clothing, and background. The lighting should look consistent and photorealistic.";
      break;
    case EditMode.AGE_CHANGE:
      const ageDesc = ageDirection === AgeDirection.YOUNGER ? "much younger, like a teenager or young adult (approx 18-24 years old)" :
                      ageDirection === AgeDirection.CHILD ? "like a young child (approx 5-8 years old)" :
                      ageDirection === AgeDirection.ELDERLY ? "elderly (approx 75+ years old) with natural aging features" :
                      "older and more mature (approx 50-60 years old)";
      
      promptText = `Edit this photo to make the person look ${ageDesc}. Preserve the original identity, facial structure, ethnicity, and background context exactly. Only change the age-related characteristics (skin texture, hair). Return a highly realistic, seamless photo.`;
      break;
    case EditMode.CLOTH_CHANGE:
      promptText = `Change the person's clothing in this photo to: ${customPrompt || 'stylish modern casual wear'}. Maintain the exact body pose, facial expression, and background. The clothing should fit naturally and look photorealistic.`;
      break;
    case EditMode.BG_REMOVE:
      promptText = "Remove the background of this image and replace it with a solid clean white background. Isolate the main subject perfectly. Do not alter the subject's appearance.";
      break;
    case EditMode.BG_CHANGE:
      promptText = `Change the background of this image to: ${customPrompt || 'a beautiful outdoor scenery'}. Ensure the lighting on the subject matches the new background for a realistic composite. Keep the subject exactly the same.`;
      break;
    case EditMode.OBJECT_REMOVE:
       promptText = `Remove the ${customPrompt || 'object'} from this image. Fill in the empty space seamlessly to match the surrounding background pattern and texture. The result should look natural as if the object was never there.`;
       break;
    case EditMode.HEADSHOT:
      promptText = "Transform this photo into a professional corporate headshot. The person should be wearing professional business attire (suit/blazer). Ensure neutral professional lighting and a soft blurred office or studio background. Maintain the person's identity perfectly.";
      break;
    case EditMode.SKETCH:
      promptText = "Convert this image into a high-quality pencil sketch. Detailed shading, artistic strokes, black and white graphite style.";
      break;
    case EditMode.CARTOONIFY:
      promptText = "Transform this image into a high-quality 3D Disney/Pixar style cartoon character. Keep the resemblance to the original person but stylized. Vibrant colors, smooth shading.";
      break;
    default:
      promptText = "Improve this image quality and aesthetics.";
  }

  const mimeType = getMimeType(base64Input);
  const rawBase64 = extractBase64Data(base64Input);

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            text: promptText,
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: rawBase64,
            },
          },
        ],
      },
    });

    if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const returnMime = part.inlineData.mimeType || 'image/png';
          return `data:${returnMime};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("The AI did not return an image. Please try again with a different photo or mode.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate image. Please check your connection and try again.");
  }
};