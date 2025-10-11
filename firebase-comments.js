// Firebase配置
const firebaseConfig = {
    apiKey: "AIzaSyAX7Rku_UDyLPKgYayNwVlHSjJgVnnfvzw",
    authDomain: "guestbook-60225.firebaseapp.com",
    projectId: "guestbook-60225",
    storageBucket: "guestbook-60225.firebasestorage.app",
    messagingSenderId: "891655640133",
    appId: "1:891655640133:web:a884de075f6f84f8fc3f2c"
};

console.log("=== Firebase评论系统启动 ===");

// 初始化 Firebase（只执行一次）
if (!firebase.apps.length) {
    var app = firebase.initializeApp(firebaseConfig);
} else {
    var app = firebase.app();
}

var auth = firebase.auth();
var db = firebase.firestore();

console.log("Firebase初始化完成");

// 匿名登录函数
async function anonymousLogin() {
    try {
        const userCredential = await auth.signInAnonymously();
        console.log("匿名登录成功，用户ID:", userCredential.user.uid);
        return userCredential.user;
    } catch (error) {
        console.error("匿名登录失败:", error);
        return null;
    }
}

// 发布评论（带详细日志）
async function postComment(commentText) {
    console.log("开始发布评论:", commentText);
    
    const user = await anonymousLogin();
    if (!user) {
        alert('登录失败，无法发布评论');
        return;
    }
    
    if (!commentText.trim()) {
        alert('请输入评论内容！');
        return;
    }
    
    try {
        console.log("用户信息:", user.uid);
        console.log("准备写入数据库...");
        
        const commentData = {
            uid: user.uid,
            author: `游客_${Math.random().toString(36).substr(2, 5)}`,
            text: commentText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            likedBy: []
        };
        
        console.log("评论数据:", commentData);
        
        const result = await db.collection("comments").add(commentData);
        console.log("✅ 评论发布成功，文档ID:", result.id);
        
        // 清空输入框
        document.getElementById('messageText').value = '';
        
    } catch (error) {
        console.error("❌ 评论发布失败:", error);
        console.error("错误详情:", error.code, error.message);
        alert('评论发布失败: ' + error.message);
    }
}

// 点赞评论
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
            await commentRef.update({
                likes: firebase.firestore.FieldValue.increment(-1),
                likedBy: firebase.firestore.FieldValue.arrayRemove(userId)
            });
        } else {
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
    console.log("开始监听评论...");
    
    db.collection("comments")
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            console.log("收到评论更新，文档数量:", snapshot.size);
            
            const commentsContainer = document.getElementById('commentsContainer');
            if (!commentsContainer) {
                console.error("找不到commentsContainer元素");
                return;
            }
            
            commentsContainer.innerHTML = '';
            
            if (snapshot.empty) {
                commentsContainer.innerHTML = '<p style="text-align: center; color: #666;">还没有留言，快来写下第一条吧！</p>';
                return;
            }
            
            snapshot.forEach((doc) => {
                const comment = doc.data();
                console.log("显示评论:", comment);
                
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
        }, (error) => {
            console.error("监听评论失败:", error);
        });
}

// 格式化时间显示
function formatTime(timestamp) {
    if (!timestamp) return '时间未知';
    try {
        const date = timestamp.toDate();
        return date.toLocaleString('zh-CN');
    } catch (error) {
        return '时间格式错误';
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM加载完成，初始化评论系统");
    
    // 开始监听评论
    listenToComments();
    
    // 为发布按钮添加事件
    const publishBtn = document.getElementById('publishBtn');
    const commentInput = document.getElementById('messageText');
    
    if (publishBtn && commentInput) {
        publishBtn.addEventListener('click', function() {
            const text = commentInput.value.trim();
            if (text) {
                postComment(text);
            }
        });
        
        // 回车键发布
        commentInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = commentInput.value.trim();
                if (text) {
                    postComment(text);
                }
            }
        });
    } else {
        console.error("找不到发布按钮或输入框");
    }
    
    // 初始匿名登录
    anonymousLogin();
});