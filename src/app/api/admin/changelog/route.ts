import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    const content = await readFile(changelogPath, 'utf-8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Failed to read changelog:', error);
    return NextResponse.json(
      { error: 'Failed to read changelog' },
      { status: 500 }
    );
  }
}

