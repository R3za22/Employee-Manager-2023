import { Link } from 'react-router-dom'
import { Page } from '../components/ui'
import { useLocale } from '../i18n'

export function NotFound() {
  const { t } = useLocale()
  return (
    <Page title={t('nf.title')}>
      <div className="card state">
        <p>{t('nf.body')}</p>
        <Link to="/" className="btn btn-primary">{t('nf.home')}</Link>
      </div>
    </Page>
  )
}
