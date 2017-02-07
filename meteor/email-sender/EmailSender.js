import { _ } from 'lodash';
import { Meteor } from 'meteor/meteor';
import { Email } from 'meteor/email';
import { SSR } from 'meteor/meteorhacks:ssr';

/**
 * Send email for users
 *
 * Provides rendering email templates ana sending emails for users
 *
 * Example of usage
 *
 * new EmailSender('your subject', 'template_name', {}).
 *      withFooter('footer_name').withAttachments([attachments]).
 *       sendFor(['email1', 'email2']);
 *
 * @constructor
 *
 * @param {String}
 * @param {String} name of template for rendering from private/templates
 * @param {Object} data for template
 */
class EmailSender {
  constructor(subject, templateName, templateDate) {
    this._senderEmail = Meteor.settings.AWSMail.default.from;
    this._emailTemplatePath = 'templates/emails/';
    this._footerTemplatePath = `${this._emailTemplatePath}footers/`;
    this._wrapperName = 'email_wrapper';

    this._subject = subject;
    this._templateName = templateName;
    this._templateDate = templateDate;
    this._template = null;
    this._footer = null;

    this._sendEmail = this._sendEmail.bind(this);
  }

  _isUserAllowSending(recipient) {
    return true
  }
  _canSedForRecipient(recipient) {
    const isDependFromUserSettings =
      this._templates.notification.indexOf(this._templateName) !== -1;

    return isDependFromUserSettings ?
      this._isUserAllowSending(recipient) : true;
  }
  /**
   * Send Email
   *
   * Sending email in background
   *
   * @private
   * @param {String}
   */
  _sendEmail(recipient) {
    Meteor.defer(() => {
      Email.send({
        to: recipient,
        from: `FindEd ${this._senderEmail}`, // email address should be verified in AWS SES
        subject: this._subject,
        html: this._template,
        attachments: this._attachments,
      });
    });
  }
  /**
   * Render email footer
   *
   * @param {String}
   * @param {Object} data for template
   */
  withFooter(footerName, data = {}) {
    // const rootUrl = process.env.ROOT_URL;
    const rootUrl = Meteor.absoluteUrl();
    const logoUrl = Meteor.absoluteUrl('img/logo.png');
    const siteName = EmailSender.extractDomain(rootUrl);

    SSR.compileTemplate(footerName,
      Assets.getText(`${this._footerTemplatePath}${footerName}.html`));
    this._footer = SSR.render(footerName, { rootUrl, logoUrl, siteName, ...data });
    return this;
  }
  /**
   * Attach for email any attachments
   *
   * @param [Object] data for template
   */
  withAttachments(attachments) {
    this._attachments = attachments;
    return this;
  }
  /**
   * Render email template
   *
   * @return {String}
   */
  renderTemplate() {
    SSR.compileTemplate(this._templateName,
        Assets.getText(`${this._emailTemplatePath}${this._templateName}.html`));
    SSR.compileTemplate(this._wrapperName,
        Assets.getText(`${this._emailTemplatePath}${this._wrapperName}.html`));

    const email = SSR.render(this._templateName, this._templateDate);

    this._template = SSR.render(this._wrapperName, {
      email,
      subject: this._subject,
      footer: this._footer,
    });

    return this._template;
  }
  /**
   * Send email for email addresses
   *
   * @param [Object] email addresses
   */
  sendFor(recipients) {
    this.renderTemplate();
    const emails = _.isArray(recipients) ? recipients : [recipients];
    emails.forEach(email => this._canSedForRecipient(email) && this._sendEmail(email));
  }
  static hrefFor(path, data) {
    const { ROOT_URL } = process.env;
    const domainPath = ROOT_URL.slice(-1) === '/' && ROOT_URL || `${ROOT_URL}/`;
    const dataToPath = key => `${data[key]}/`;
    const datePath = data ? Object.keys(data).map(dataToPath).join('') : '';

    return `${domainPath}${path}${datePath}`;
  }
  /**
   * Rerurn site name from full domain path
   *
   * @param {String} domain path
   * @return {String} site name
   */
  static extractDomain(url) {
    const domain = url.indexOf("://") > -1 ?
      url.split('/')[2] : url.split('/')[0];
    return domain.split(':')[0];
  }
}

export { EmailSender };