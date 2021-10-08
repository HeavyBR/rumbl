import Player from "./player";
import { Presence } from "phoenix"

let Video = {
    init(socket, element) {
        if (!element) {
            return
        }

        let playerId = element.getAttribute('data-player-id');
        let videoId = element.getAttribute('data-id');
        socket.connect()
        Player.init(element.id, playerId, (_event) => {
            this.onReady(videoId, socket)
        })
    },

    onReady(videoId, socket) {
        let msgContainer = document.getElementById('msg-container');
        let msgInput = document.getElementById('msg-input');
        let postbutton = document.getElementById('msg-submit');
        let userList = document.getElementById("user-list")
        let lastSeenId = 0
        let videoChannel = socket.channel("videos:" + videoId, () => {
            return { last_seen_id: lastSeenId }
        });

        let presence = new Presence(videoChannel)
        presence.onSync(() => {
            userList.innerHTML = presence.list((id, { user: user, metas: [first, ...rest] }) => {
                let count = rest.length + 1
                return `<li>${user.username}: (${count})</li>`
            }).join("")
        })


        postbutton.addEventListener("click", e => {
            let payload = { body: msgInput.value, at: Player.getCurrentTime() }
            videoChannel.push("new_annotation", payload)
                .receive("ok", resp => {
                    console.log("created annotation successfully", resp)
                    msgInput.value = ""
                })
                .receive("error", resp => {
                    console.log("Unable to create annotation", resp)
                })

            msgInput.value = ""
        })

        videoChannel.on("new_annotation", (resp) => {
            this.renderAnnotation(msgContainer, resp)
        })

        videoChannel.join()
            .receive("ok", ({ annotations }) => {
                let ids = resp.annotations.map(ann => ann.id)
                if (ids.length > 0) {
                    lastSeenId = Math.max(...ids)
                }
                this.scheduleMessages(msgContainer, annotations)
            })
            .receive("error", resp => {
                console.log("Unable to join", resp)
            })


        msgContainer.addEventListener("click", e => {
            e.preventDefault()
            let seconds = e.target.getAttribute("data-seek") || e.target.parentNode.getAttribute("data-seek")

            if (!seconds) { return }

            Player.seekTo(seconds)
        })


    },

    esc(string) {
        let div = document.createElement('div');
        div.appendChild(document.createTextNode(string));
        return div.innerHTML;
    },

    renderAnnotation(msgContainer, { user, body, at }) {
        let template = document.createElement('div')

        template.innerHTML = `
            <a href="#" data-seek="${this.esc(at)}">
            [${this.formatTime(at)}]
            <b>${this.esc(user.username)}</b>: ${this.esc(body)}
            </a>
        `
        msgContainer.appendChild(template)
        msgContainer.scrrollTop = msgContainer.scrollHeight
    },

    scheduleMessages(msgContainer, annotations) {
        clearTimeout(this.schedulerTimer)
        this.schedulerTimer = setTimeout(() => {
            let ctime = Player.getCurrentTime()
            let remaining = this.renderAtTime(annotations, ctime, msgContainer)
            this.scheduleMessages(msgContainer, remaining)
        }, 1000)
    },

    renderAtTime(annotations, seconds, msgContainer) {
        return annotations.filter(ann => {
            if (ann.at > seconds) {
                return true
            } else {
                this.renderAnnotation(msgContainer, ann)
                return false
            }
        })
    },

    formatTime(at) {
        let date = new Date(null)
        date.setSeconds(at / 1000)
        return date.toISOString().substr(14, 5)
    }
}

export default Video;