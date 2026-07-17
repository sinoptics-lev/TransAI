import React from 'react';

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  const html = parseMarkdown(content);
  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function parseMarkdown(text: string): string {
  let html = escapeHtml(text);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Numbered lists
  html = html.replace(/^\d+\.\s+(.*$)/gim, '<li>$1</li>');

  // Wrap consecutive <li> in <ol>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    return '<ol class="ai-list">' + match + '</ol>';
  });

  // Bullet lists (with - or •)
  html = html.replace(/^[-•]\s+(.*$)/gim, '<li class="bullet">$1</li>');
  html = html.replace(/(<li class="bullet">.*<\/li>\n?)+/g, (match) => {
    return '<ul class="ai-list">' + match.replace(/ class="bullet"/g, '') + '</ul>';
  });

  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
