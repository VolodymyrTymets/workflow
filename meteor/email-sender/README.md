# Email Sender

### Description

Send email for users.

Provides rendering email templates ana sending emails for users.

###Example of usage

```
 new EmailSender('your subject', 'template_name', {}).
      withFooter('footer_name').withAttachments([attachments]).
       sendFor(['email1', 'email2']);
```

### Addition Information

Add into `private/templates/emails` email html templates.
Also add email wrapper into `private/templates/emails`

# Pdf Builder

### Description

Build pdf from Html.

Provides rendering pdf templates and build Pdf.

###Example of usage

```
  new PdfBuilder('template_name', {})
   .build('new pdf file name', { format: 'Letter' }, pdf => ...)
```

### Addition Information

Add into `private/templates/pdfs` html templates.
