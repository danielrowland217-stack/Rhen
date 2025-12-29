import { NextRequest, NextResponse } from 'next/server';
import { setupLogger } from '../../../lib/logger';

const logger = setupLogger();

export async function GET(request: NextRequest) {
  logger.info(`Request received: ${request.method} ${request.nextUrl.pathname}`);
  return NextResponse.json({ message: 'Welcome to the Rhen Store API!' });
}
