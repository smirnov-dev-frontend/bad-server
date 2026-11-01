import DOMPurify from 'dompurify'

export function sanitizeHtml(value: string) {
    return DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [
            'a',
            'b',
            'strong',
            'i',
            'em',
            'u',
            'p',
            'br',
            'div',
            'span',
            'ul',
            'ol',
            'li',
        ],
        ALLOWED_ATTR: ['href', 'title'],
        ALLOWED_URI_REGEXP: /^https?:\/\//i,
        ALLOW_DATA_ATTR: false,
    })
}
