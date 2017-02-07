import { _ } from 'lodash';
import { Meteor } from 'meteor/meteor';
import { SSR } from 'meteor/meteorhacks:ssr';
import pdf from 'html-pdf';

/**
 * Build pdf from Html
 *
 * Provides rendering pdf templates and build Pdf
 *
 * Example of usage
 *
 * new PdfBuilder('template_name', {})
 *  .build('new pdf file name', { format: 'Letter' }, pdf => ...)
 *
 * @constructor
 *
 * @param {String} name of template for rendering from private/templates
 * @param {object} data for template
 */
class PdfBuilder {
  constructor(templateName, templateDate) {
    this._templatePath = 'templates/pdf/';
    this._templateName = templateName;
    this._templateDate = templateDate;
  }

  _renderTemplate() {
    SSR.compileTemplate(this._templateName,
      Assets.getText(`${this._templatePath}${this._templateName}.html`));
    return SSR.render(this._templateName, this._templateDate);
  }
  /**
   * Send email for email addresses
   *
   * @param [String] email addresses
   */
  build(fileName, options, ...callbacks) {
    pdf.create(this._renderTemplate(), options).toStream(
      Meteor.bindEnvironment((error, stream) => {
        if (!error) {
          const attachedPDF = {
            fileName: fileName,
            streamSource: stream,
          };
          callbacks.forEach(callback => callback(attachedPDF));
        } else {
          console.log('Error creating pdf: ', error);
        }
      }));
  }
}

export { PdfBuilder };