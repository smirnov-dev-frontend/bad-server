import { sanitizeHtml } from '../../utils/sanitize-html'
import {
    ContentEditableEvent,
    createButton,
    Editor,
    EditorProvider,
    Toolbar,
} from 'react-simple-wysiwyg'
import './editor-input.scss'

type EditorInputProps = {
    value: string
    onChange: (value: string) => void
}

export default function EditorInput({ onChange, value }: EditorInputProps) {
    function handleChangeElement(e: ContentEditableEvent) {
        onChange(sanitizeHtml(e.target.value))
    }

    const BtnLinkCustom = createButton(
        'Вставить ссылку',
        '🔗',
        ({ $selection }) => {
            if ($selection?.nodeName === 'A') {
                document.execCommand('unlink')
            } else {
                const url = prompt('URL', '')
                if (url && /^https?:\/\//i.test(url)) {
                    document.execCommand('createLink', false, url)
                }
            }
        }
    )

    return (
        <div className='customEditor'>
            <EditorProvider>
                <Editor
                    value={sanitizeHtml(value)}
                    onChange={handleChangeElement}
                >
                    <Toolbar>
                        <span className='rsw-link-title'>
                            Вставить ссылку <BtnLinkCustom />
                        </span>
                    </Toolbar>
                </Editor>
            </EditorProvider>
        </div>
    )
}
