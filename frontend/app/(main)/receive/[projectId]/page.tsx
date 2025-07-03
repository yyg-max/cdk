import {Suspense} from 'react';
import {ReceiveMain} from '@/components/common/receive';
import {Metadata} from 'next';
import services from '@/lib/services';

interface Props {
  params: Promise<{projectId: string}>;
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  try {
    const {projectId} = await params;
    const result = await services.project.getProject(projectId);
    return {
      title: `${result.name} - 领取`,
    };
  } catch (error) {
    console.error('Failed to fetch project for metadata:', error);
  }
  return {
    title: '项目领取',
  };
}

export default function ProjectPage() {
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Suspense>
        <ReceiveMain />
      </Suspense>
    </div>
  );
}
