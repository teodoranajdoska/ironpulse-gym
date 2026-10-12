import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import nodemailer, { Transporter } from 'nodemailer';
import { Env } from '../config/env';

export type OutgoingMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  actionLink: string;
};

export type StoredDevMail = OutgoingMail & { htmlPath: string };

export interface MailTransport {
  send(message: OutgoingMail): Promise<void>;
  latestFor?(email: string): StoredDevMail | undefined;
}

@Injectable()
export class DevMailTransport implements MailTransport {
  private readonly latest = new Map<string, StoredDevMail>();
  private nextFileId = 0;

  constructor(directory?: string) {
    this.directory = resolve(
      directory ??
        resolve(
          process.cwd(),
          process.env.NODE_ENV === 'test' ? '.dev-mails-test' : '.dev-mails',
        ),
    );
  }

  private readonly directory: string;

  async send(message: OutgoingMail): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const safeEmail = message.to.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
    const fileName = `${Date.now()}-${this.nextFileId++}-${safeEmail}.html`;
    const htmlPath = resolve(this.directory, fileName);
    const stored = { ...message, htmlPath };
    await writeFile(
      htmlPath,
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>${this.escape(message.subject)}</title><body>${message.html}<hr><p>Action link: <a href="${this.escape(message.actionLink)}">${this.escape(message.actionLink)}</a></p><pre>${this.escape(message.text)}</pre></body></html>`,
      'utf8',
    );
    this.latest.set(message.to.toLowerCase(), stored);
    console.info(
      `[DevMailTransport]\nTo: ${message.to}\nSubject: ${message.subject}\nPlain text:\n${message.text}\nAction link: ${message.actionLink}\nHTML saved: ${htmlPath}`,
    );
  }

  latestFor(email: string): StoredDevMail | undefined {
    return this.latest.get(email.toLowerCase());
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

@Injectable()
export class SmtpMailTransport implements MailTransport {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    const user = config.get('SMTP_USER');
    const password = config.get('SMTP_PASSWORD');
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: config.get('SMTP_PORT'),
      secure: config.get('SMTP_PORT') === 465,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });
    this.from = config.get('SMTP_FROM');
  }

  async send(message: OutgoingMail): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
