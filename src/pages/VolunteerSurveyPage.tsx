import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SurveyEngine } from '@/features/survey/components/SurveyEngine';
import { ROUTES } from '@/constants';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { getProjectLifecycleState } from '@/utils/projectLifecycle';

export const VolunteerSurveyPage: React.FC = () => {
  const { personId } = useAuth();
  const navigate = useNavigate();
  const { project, isLoading } = useMyProjectAssignment(personId);

  const lifecycle = project ? getProjectLifecycleState(project) : null;
  const isSurveyActive = lifecycle?.isSurveyActive;

  useEffect(() => {
    if (!isLoading && project && !isSurveyActive) {
      navigate(ROUTES.VOLUNTEER_HOME);
    }
  }, [isLoading, project, isSurveyActive, navigate]);

  if (isLoading || (project && !isSurveyActive)) {
    return null;
  }

  return (
    <SurveyEngine
      onComplete={() => {
        navigate(ROUTES.VOLUNTEER_HOME);
      }}
      onCancel={() => {
        navigate(ROUTES.VOLUNTEER_HOME);
      }}
    />
  );
};
