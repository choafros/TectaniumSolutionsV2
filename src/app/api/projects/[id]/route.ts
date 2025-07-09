import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = await context.params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
    }

    const deleted = await db
      .delete(projects)
      .where(eq(projects.id, projectId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ message: 'Failed to delete project' }, { status: 500 });
  }
}
