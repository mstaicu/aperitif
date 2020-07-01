import React from 'react';
import { Link } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

export const Nav = () => {
  const { t } = useTranslation();

  return (
    <nav>
      <ul>
        <li>
          <Link to="/">{t('button.home')}</Link>
        </li>
        <li>
          <Link to="/dummy1">{t('button.dummy1')}</Link>
        </li>
        <li>
          <Link to="/dummy2">{t('button.dummy2')}</Link>
        </li>
      </ul>
    </nav>
  );
};
