import React from 'react';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { t } = useTranslation();

  return <div>{t('text')} Home page</div>;
};

export default Home;
