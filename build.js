const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // Make sure to install this package
const ejs = require('ejs'); // You may need to install EJS if you're using it for templating

const csvFilePath = path.join(__dirname, 'resources', 'risultati_moka.csv');
const outputHtmlPath = path.join(__dirname, 'docs', 'contacts.html');
const contacts = [];

// Read the CSV file
fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
        contacts.push(row);
    })
    .on('end', () => {
        // Render contacts to HTML
        const htmlContent = ejs.render(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contacts</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body>
        <div class="container mt-4">
          <h1>Contacts</h1>
          <table class="table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Website Name</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              <% contacts.forEach(contact => { %>
                <tr>
                  <td><%= contact.Fonte %></td>
                  <td><%= contact['Nome Sito'] %></td>
                  <td><%= contact.Email %></td>
                  <td><%= contact.Telefono %></td>
                </tr>
              <% }); %>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `, { contacts });

        // Write the HTML content to contacts.html
        fs.writeFileSync(outputHtmlPath, htmlContent);
        console.log('contacts.html has been generated in the docs folder.');
    });
