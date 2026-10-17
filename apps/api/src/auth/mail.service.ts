import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_NAME } from '@ironpulse/shared';
import { Env } from '../config/env';
import {
  DevMailTransport,
  MailTransport,
  SmtpMailTransport,
  StoredDevMail,
} from './mail.transport';

type MailLocale = 'mk' | 'en';

type MailCopy = {
  subject: string;
  heading: string;
  body: string;
  action: string;
};

const copy: Record<'verify' | 'reset' | 'invite', Record<MailLocale, MailCopy>> = {
  verify: {
    mk: {
      subject: 'Потврдете ја вашата е-пошта',
      heading: 'Добредојдовте во IronPulse',
      body: 'Потврдете ја вашата е-пошта за да ја активирате сметката.',
      action: 'Потврди е-пошта',
    },
    en: {
      subject: 'Verify your email',
      heading: 'Welcome to IronPulse',
      body: 'Verify your email address to activate your account.',
      action: 'Verify email',
    },
  },
  reset: {
    mk: {
      subject: 'Ресетирање на лозинка',
      heading: 'Поставете нова лозинка',
      body: 'Користете ја врската подолу за да ја смените лозинката. Врската важи еден час.',
      action: 'Ресетирај лозинка',
    },
    en: {
      subject: 'Reset your password',
      heading: 'Choose a new password',
      body: 'Use the link below to change your password. The link is valid for one hour.',
      action: 'Reset password',
    },
  },
  invite: {
    mk: {
      subject: 'Поставете лозинка за IronPulse',
      heading: 'Вашата сметка е подготвена',
      body: 'Администратор ви креираше сметка. Поставете лозинка за да се најавите.',
      action: 'Постави лозинка',
    },
    en: {
      subject: 'Set your IronPulse password',
      heading: 'Your account is ready',
      body: 'An administrator created your account. Set a password to sign in.',
      action: 'Set password',
    },
  },
};

@Injectable()
export class MailService {
  private readonly transport: MailTransport;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.transport =
      this.config.get('NODE_ENV') === 'development' || !this.config.get('SMTP_HOST')
        ? new DevMailTransport(this.config.get('DEV_MAIL_DIR'))
        : new SmtpMailTransport(this.config);
  }

  sendVerification(email: string, locale: string, token: string): Promise<void> {
    const url = this.link('/verify-email', token);
    return this.send('verify', email, locale, url);
  }

  sendPasswordReset(email: string, locale: string, token: string): Promise<void> {
    return this.send('reset', email, locale, this.link('/reset-password', token));
  }

  sendInvitation(email: string, locale: string, token: string): Promise<void> {
    return this.send('invite', email, locale, this.link('/reset-password', token));
  }

  latestDevEmail(email: string): StoredDevMail | undefined {
    return this.transport.latestFor?.(email);
  }

  private link(path: string, token: string): string {
    const url = new URL(
      path,
      this.config.get('WEB_URL') ?? this.config.get('WEB_APP_URL'),
    );
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async send(
    type: keyof typeof copy,
    email: string,
    rawLocale: string,
    url: string,
  ): Promise<void> {
    const locale: MailLocale = rawLocale === 'mk' ? 'mk' : 'en';
    const content = copy[type][locale];
    const appName = APP_NAME;
    const text = `${content.heading}\n\n${content.body}\n\n${content.action}: ${url}`;
    const html = `<main><h1>${content.heading}</h1><p>${content.body}</p><p><a href="${url}">${content.action}</a></p><small>${appName}</small></main>`;

    await this.transport.send({
      to: email,
      subject: content.subject,
      text,
      html,
      actionLink: url,
    });
  }
}
