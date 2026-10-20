import { NextRequest, NextResponse } from 'next/server';
import { extractQuestionFromImageOcr } from '@/lib/ai/provider';
import { validateCropBox } from '@/lib/ocr-validation';

const PRESET_WORKSHEET_CROPS: Record<
  string,
  { latex: string; promptText: string; subject: string; confidence: number }
> = {
  quadratic: {
    latex: 'x^2 - 5x + 6 = 0',
    promptText: 'Solve x^2 - 5x + 6 = 0',
    subject: 'Math',
    confidence: 0.99,
  },
  calculus: {
    latex: '\\frac{d}{dx}(x^3 - 6x^2 + 9x + 2)',
    promptText: 'derivative of x^3 - 6x^2 + 9x + 2',
    subject: 'Math',
    confidence: 0.98,
  },
  integral: {
    latex: '\\int_0^3 (x^2 + 4x)\\,dx',
    promptText: 'integrate x^2 + 4x from 0 to 3',
    subject: 'Math',
    confidence: 0.99,
  },
  physics: {
    latex: 'K = \\frac{1}{2}mv^2, \\quad m = 4\\text{ kg}, v = 15\\text{ m/s}',
    promptText:
      'A 4 kg object moves at 15 m/s. Find its kinetic energy.',
    subject: 'Physics',
    confidence: 0.99,
  },
  chemistry: {
    latex: '\\text{pH} = -\\log_{10}(0.001)',
    promptText: 'Find the pH of a 0.001 M HCl solution',
    subject: 'Chemistry',
    confidence: 0.99,
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate cropBox coordinates strictly (Fixes R28)
    const rawCropBox = body.cropBox ?? { x: 12, y: 18, width: 76, height: 54 };
    const cropBox = validateCropBox(rawCropBox);
    if (!cropBox) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Invalid cropBox coordinates: x, y, width, height must be positive percentages within [0, 100].',
        },
        { status: 400 }
      );
    }

    const customLatex = body.customLatex ? String(body.customLatex).trim() : '';
    const croppedImageDataUrl =
      typeof body.croppedImageDataUrl === 'string'
        ? body.croppedImageDataUrl.trim()
        : '';
    const presetKey =
      typeof body.preset === 'string' ? body.preset.trim().toLowerCase() : '';

    // 2. If user provided an explicit transcription override
    if (customLatex) {
      return NextResponse.json({
        ok: true,
        ocr: {
          extractedPrompt: customLatex,
          extractedLatex: customLatex,
          subject: String(body.subject || 'Math'),
          confidence: 1.0,
          source: 'manual-override',
          cropBox,
          boundingRegions: [
            {
              label: 'Manual Transcription Override',
              ...cropBox,
            },
          ],
        },
      });
    }

    // 3. If a real cropped image data URL is provided, run Multimodal Vision OCR
    if (croppedImageDataUrl) {
      if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(croppedImageDataUrl)) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Invalid croppedImageDataUrl: must be a valid base64 PNG/JPEG/WebP data URL.',
          },
          { status: 400 }
        );
      }

      const visionResult = await extractQuestionFromImageOcr({
        imageDataUrl: croppedImageDataUrl,
        cropBox,
        subjectHint: typeof body.subject === 'string' ? body.subject : undefined,
      });

      if (visionResult.ok && visionResult.extractedPrompt) {
        return NextResponse.json({
          ok: true,
          ocr: {
            extractedPrompt: visionResult.extractedPrompt,
            extractedLatex: visionResult.extractedLatex,
            subject: visionResult.subject,
            confidence: visionResult.confidence,
            source: `vision-ocr (${visionResult.model})`,
            cropBox,
            boundingRegions: [
              {
                label: 'Vision OCR Cropped Region',
                ...cropBox,
              },
            ],
          },
        });
      }

      // If vision could not find readable math and a valid demo preset is not specified, return 422
      if (!presetKey || !(presetKey in PRESET_WORKSHEET_CROPS)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Could not extract a readable equation from the cropped image region. Please adjust the crop handles or enter the expression.',
          },
          { status: 422 }
        );
      }
    }

    // 4. Demo worksheet preset path: strictly validate presetKey (no silent fallback on invalid preset!)
    const effectivePresetKey = presetKey || 'quadratic';
    const matched = PRESET_WORKSHEET_CROPS[effectivePresetKey];
    if (!matched) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unknown worksheet preset "${presetKey}" and no valid image payload provided.`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      ocr: {
        extractedPrompt: matched.promptText,
        extractedLatex: matched.latex,
        subject: matched.subject,
        confidence: matched.confidence,
        source: `demo-preset:${effectivePresetKey}`,
        cropBox,
        boundingRegions: [
          {
            label: 'Primary Equation Region',
            x: cropBox.x,
            y: cropBox.y,
            width: cropBox.width,
            height: cropBox.height,
          },
        ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'OCR extraction failed.',
      },
      { status: 500 }
    );
  }
}
