// 调试信息
console.log("Firebase评论系统加载中...");

// 您的firebaseConfig代码...

// 检查初始化状态
firebase.initializeApp(firebaseConfig);
console.log("Firebase初始化完成");

const auth = firebase.auth();
const db = firebase.firestore();
console.log("Firestore数据库连接建立");

// Firebase配置（从控制台获取并替换这些值）
const firebaseConfig = {
  apiKey: "AIzaSyAX7Rku_UDyLPKgYayNwVlHSjJgVnnfvzw",
  authDomain: "guestbook-60225.firebaseapp.com",
  projectId: "guestbook-60225",
  storageBucket: "guestbook-60225.firebasestorage.app",
  messagingSenderId: "891655640133",
  appId: "1:891655640133:web:a884de075f6f84f8fc3f2c"
};

// 初始化 Firebase（不初始化Storage）
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// 注意：我们没有初始化 storage

// 匿名登录函数
async function anonymousLogin() {
    try {
        const userCredential = await auth.signInAnonymously();
        console.log("匿名登录成功，用户ID:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("匿名登录失败:", error);
    }
}

// 页面加载时自动匿名登录
document.addEventListener('DOMContentLoaded', function() {
    anonymousLogin();
});

// 发布评论
async function postComment(commentText) {
    const user = await anonymousLogin();
    if (!commentText.trim()) {
        alert('请输入评论内容！');
        return;
    }
    
    try {
        await db.collection("comments").add({
            uid: user.uid,
            author: `游客_${Math.random().toString(36).substr(2, 5)}`,
            text: commentText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            likedBy: []
        });
        console.log("评论发布成功！");
    } catch (error) {
        console.error("发布评论失败:", error);
        alert('发布评论失败，请重试！');
    }
}

// 点赞/取消点赞评论
async function likeComment(commentId) {
    const user = await anonymousLogin();
    if (!user) return;
    
    const userId = user.uid;
    const commentRef = db.collection("comments").doc(commentId);
    
    try {
        const commentDoc = await commentRef.get();
        if (!commentDoc.exists) return;
        
        const commentData = commentDoc.data();
        
        if (commentData.likedBy.includes(userId)) {
            // 已点赞，取消点赞
            await commentRef.update({
                likes: firebase.firestore.FieldValue.increment(-1),
                likedBy: firebase.firestore.FieldValue.arrayRemove(userId)
            });
        } else {
            // 未点赞，添加点赞
            await commentRef.update({
                likes: firebase.firestore.FieldValue.increment(1),
                likedBy: firebase.firestore.FieldValue.arrayUnion(userId)
            });
        }
    } catch (error) {
        console.error("点赞操作失败:", error);
    }
}

// 实时监听并显示评论
function listenToComments() {
    db.collection("comments")
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            const commentsContainer = document.getElementById('commentsContainer');
            if (!commentsContainer) return;
            
            commentsContainer.innerHTML = '';
            
            if (snapshot.empty) {
                commentsContainer.innerHTML = '<p style="text-align: center; color: #666;">还没有留言，快来写下第一条吧！</p>';
                return;
            }
            
            snapshot.forEach((doc) => {
                const comment = doc.data();
                const commentElement = document.createElement('div');
                commentElement.className = 'comment-item';
                commentElement.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${comment.author}</span>
                        <span class="comment-time">${formatTime(comment.timestamp)}</span>
                    </div>
                    <div class="comment-content">${comment.text}</div>
                    <div class="comment-actions">
                        <button onclick="likeComment('${doc.id}')" class="like-btn">
                            👍 点赞 (${comment.likes || 0})
                        </button>
                    </div>
                `;
                commentsContainer.appendChild(commentElement);
            });
        });
}

// 格式化时间显示
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('zh-CN');
}

// 页面加载完成后开始监听评论
document.addEventListener('DOMContentLoaded', function() {
    listenToComments();
});

// 为发布按钮添加事件监听（假设您的HTML中有id为publishBtn的按钮）
document.addEventListener('DOMContentLoaded', function() {
    const publishBtn = document.getElementById('publishBtn');
    const commentInput = document.getElementById('messageText');
    
    if (publishBtn && commentInput) {
        publishBtn.addEventListener('click', function() {
            postComment(commentInput.value);
            commentInput.value = ''; // 清空输入框
        });
        
        // 按回车键也可以发布
        commentInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                postComment(commentInput.value);
                commentInput.value = '';
            }
        });
    }
});