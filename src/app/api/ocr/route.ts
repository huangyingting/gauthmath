import { NextRequest, NextResponse } from 'next/server';

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
      'A 4 kg projectile is launched at velocity 15 m/s. Find its kinetic energy and explain Newton’s Second Law F = ma.',
    subject: 'Physics',
    confidence: 0.97,
  },
  chemistry: {
    latex: '\\text{pH} = -\\log_{10}(0.001)',
    promptText:
      'Calculate the pH of a 0.001 M HCl strong acid solution at 25°C and state the Ideal Gas Law PV = nRT.',
    subject: 'Chemistry',
    confidence: 0.98,
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const presetKey = String(body.preset || 'quadratic').toLowerCase();
    const cropBox = body.cropBox || { x: 12, y: 18, width: 76, height: 54 };
    const customLatex = body.customLatex ? String(body.customLatex).trim() : '';

    const matched =
      PRESET_WORKSHEET_CROPS[presetKey] || PRESET_WORKSHEET_CROPS.quadratic;

    const extractedPrompt = customLatex || matched.promptText;
    const extractedLatex = customLatex || matched.latex;

    return NextResponse.json({
      ok: true,
      ocr: {
        extractedPrompt,
        extractedLatex,
        subject: matched.subject,
        confidence: matched.confidence,
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
