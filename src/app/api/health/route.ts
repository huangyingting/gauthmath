import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIProviderStatus } from '@/lib/ai/provider';

export async function GET() {
  const startTime = Date.now();
  try {
    const [userCount, questionCount] = await Promise.all([
      prisma.user.count(),
      prisma.homeworkQuestion.count(),
    ]);
    const aiStatus = getAIProviderStatus();

    return NextResponse.json({
      ok: true,
      status: 'healthy',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      database: {
        connected: true,
        users: userCount,
        questions: questionCount,
      },
      aiEngine: {
        configuredMode: aiStatus.configuredMode,
        activeProvider: aiStatus.activeProvider,
        azureConfigured: aiStatus.azureConfigured,
        azureDeployment: aiStatus.azureDeployment,
        azureVisionDeployment: aiStatus.azureVisionDeployment,
        copilotModel: aiStatus.copilotModel,
        symbolicCasReady: aiStatus.symbolicCasReady,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: 'degraded',
        error:
          error instanceof Error ? error.message : 'Database connectivity check failed.',
      },
      { status: 503 }
    );
  }
}
