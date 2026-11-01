export function getCookie(name: string) {
    const prefix = `${encodeURIComponent(name)}=`
    const cookie = document.cookie
        .split('; ')
        .find((value) => value.startsWith(prefix))
    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined
}

export function setCookie(
    name: string,
    value: string,
    props: { [key: string]: string | number | Date | boolean } = {}
) {
    props = {
        path: '/',
        SameSite: 'Lax',
        ...(location.protocol === 'https:' ? { Secure: true } : {}),
        ...props,
    }

    let exp = props.expires
    if (typeof exp == 'number' && exp) {
        const d = new Date()
        d.setTime(d.getTime() + exp * 1000)
        exp = props.expires = d
    }
    if (exp && exp instanceof Date) {
        props.expires = exp.toUTCString()
    }
    value = encodeURIComponent(value)
    let updatedCookie = name + '=' + value
    for (const propName in props) {
        updatedCookie += '; ' + propName
        const propValue = props[propName]
        if (propValue !== true) {
            updatedCookie += '=' + propValue
        }
    }
    document.cookie = updatedCookie
}
