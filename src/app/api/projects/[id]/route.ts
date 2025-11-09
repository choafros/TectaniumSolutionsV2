import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

interface JwtPayload {
  userId: number;
  role: 'admin' | 'candidate' | 'client';
}

async function getAuthPayload(): Promise<JwtPayload | null> {
  
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) return null;
  try {
    const secret = process.env.JWT_SECRET!;
    return verify(token, secret) as JwtPayload;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {

  const auth = await getAuthPayload();

  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  
  if (!id) {
    return NextResponse.json({ message: 'Invalid invoice Id' }, { status: 400 });
  }
  const projectId = parseInt(id, 10);

  if (isNaN(projectId)) {
    return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
  }

  try {
    const deletedProject = await db
      .delete(projects)
      .where(eq(projects.id, projectId))
      .returning();

    if (deletedProject.length === 0) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    revalidatePath('/dashboard/projects');

    return NextResponse.json({ message: `Project "${deletedProject[0].name}" deleted successfully` });
  } catch (error) {
    console.error(`Failed to delete project ${projectId}:`, error);
    return NextResponse.json({ message: 'Failed to delete project' }, { status: 500 });
  }
}
