import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SurveyEngine } from '@/features/survey/components/SurveyEngine';
import { ROUTES } from '@/constants';

export const VolunteerSurveyPage: React.FC = () => {
  const navigate = useNavigate();

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
