import React, { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import "./DisplayText";
import { UserContext } from "./context/user.context";
import {
  createUserDocFromAuth,
  signInAuthWithEmailAndPassword,
  signInWithGooglePopup,
  signInWithGoogleRedirect,
  getGoogleRedirectResult,
} from "./untils/firebase";
import { getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import AnimatedPage from "./AnimatedPage";
import { useTranslation } from "react-i18next";
import ReCAPTCHA from "react-google-recaptcha";
import jwt_decode from 'jwt-decode';


//document.body.style = 'background: red;';
function Login(props) {
  const myServerLoginOnly = true;
  const captchaRef = useRef(null);
  const [reCaptchaToken, setReCaptchaToken] = useState();
  const { t } = useTranslation();
  const { setCurrentUser, setCurrentUserAuth, setCurrentBalance } = useContext(UserContext);
  const { setCurrentUserUid } = useContext(UserContext);
  const [contact, setContact] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  var [disabled, setDisabled] = useState("disabled");
  var [loading, setLoading] = useState("");
  const { email, password } = contact;
  const navigate = useNavigate();
  // 使用 useEffect 来初始化 rememberMe 状态
  useEffect(() => {
    const rememberMeValue = localStorage.getItem("rememberMe");
    if (rememberMeValue !== null) {
      setContact((prevContact) => ({
        ...prevContact,
        rememberMe: rememberMeValue === "true", // 将字符串转换为布尔值
      }));
    }
  }, []);
  const handleChange = function (event) {
    const { name, value } = event.target;
    setContact(function (preValue) {
      return {
        ...preValue,
        [name]: value,
      };
    });
  };

  function onReCAPTCHAChange(value) {
    setReCaptchaToken(value)
    // Remove the disabled state of the button when captcha is checked
    setDisabled("");
  }
  function onReCAPTCHAExpired() {
    setDisabled("disabled");
  }
  const formDisable = function () {
    disabled = "disabled";
    loading = "loading";
    setDisabled(disabled);
    setLoading(loading);
  };
  const handleRememberMeChange = (event) => {
    const { name, checked } = event.target;
    setContact((prevContact) => ({
      ...prevContact,
      [name]: checked,
    }));

    // 将 rememberMe 的值存储在 localStorage 中
    localStorage.setItem("rememberMe", checked);
  };
  const formEnable = function () {
    //disabled = "";
    loading = "";
    setDisabled(disabled);
    setLoading(loading);
  };

  const logGoogleUser = async () => {
    /* Google 登录功能已被禁用，如果要开启，删除注释符号
        formDisable();

        try {
            const { user } = await signInWithGooglePopup();

            const userDocRef = await createUserDocFromAuth(user);
            //window.location.href = "/"
            console.log('login success')

            
            setCurrentUser(user)
            navigate('/profile')


        } catch (error) {
            formEnable();
        }
        */
  };

  const logUser = async (event) => {
    event.preventDefault();
    if (!password.trim() || !email.trim()) {
      alert(t("Please complete all blank"));
      return;
    } else if (password.length < 6 || password.length > 99) {
      alert(t("#Password Require"))
      return;
    } else if (email.length > 99) {
      alert(t("#The {name} should less then {number} characters", { name: t("Email"), number: "99" }))
      return;
    } else if (!/^[\w\.-]+$/.test(password)) {
      alert(t('#Invalid characters'))
      return;
    }
    if (loading === "loading") return;

    formDisable();

    try {
      if (email.startsWith("#Admin@") || myServerLoginOnly === true) {

        const requestData = {
          userName: email,
          password: password,
          recaptchaToken: reCaptchaToken,
          rememberMe: contact.rememberMe
        }
        const response = await fetch(
          "https://node-web-app-lctsz7rrlq-uc.a.run.app/login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
          }
        );
        if (response.ok) {
          const token = await response.text();
          const decoded = jwt_decode(token);
          setCurrentUser(email);
          setCurrentUserUid(token);
          setCurrentUserAuth(decoded);
          setCurrentBalance(decoded.balance);

          // 设置cookie
          if (contact.rememberMe) {
            const currentDate = new Date();

            // 设置过期时间为当前时间加上24小时*7
            const expirationDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

            // 将过期时间转换为GMT格式字符串
            const expirationDateString = expirationDate.toGMTString();

            const userInfo = JSON.stringify(token);
            document.cookie = `userInfo=${userInfo}; expires=${expirationDateString}; path=/`;
          }



          navigate("/gpt-chat");
        } else {
          const errorMessageContent = await response.text();
          const status = response.status;
          let errorContent = errorMessageContent;
          if (status === 401) {
            errorContent = t("Wrong email or password");
          }
          const errorMessage = `${t("Login Failed")}, ${errorContent}. `;
          window.alert(errorMessage);
          console.error(errorMessage + "Status code:" + status);
          formEnable();
          captchaRef.current.reset();
          setDisabled(disabled);

        }
      } else {
        const { user } = await signInAuthWithEmailAndPassword(email, password);
        setCurrentUser(user);
        setCurrentUserUid("0000-x");
        navigate("/gpt-chat");
        //window.location.href="/"
        //alert('login success')
        console.log("Login success");
      }
    } catch (error) {
      formEnable();
      var errorCode = error.code;
      if (errorCode === "auth/wrong-password") {
        alert("Login Failed, wrong passowrd.");
      } else if (errorCode === "auth/user-not-found") {
        alert("User does not exist");
      } else if (errorCode === "auth/too-many-requests") {
        alert("Too many attempts. Please try again later");
      } else alert(error.message);
      console.log(error);
      captchaRef.current.reset();
      setDisabled(disabled);
      return;
    }
  };
  const checkUserExist = async (userDocRef) => {
    const userSnapshot = await getDoc(userDocRef);
    if (userSnapshot.exists()) {
      alert("login success");
      window.location.href = "/";
    } else {
      alert("Login failed!");
    }
  };

  return (
    <AnimatedPage>
      <div>
        <div className="login-page">
          <div className="form">
            <form className="login-form" onSubmit={logUser}>
              <div className={loading}>
                <h1 className="info ">{t("Login")}</h1>
                <input
                  disabled={loading === "loading" ? disabled : false}
                  name="email"
                  type="text"
                  placeholder={t("Email")}
                  onChange={handleChange}
                  value={contact.email}
                />
                <input
                  disabled={loading === "loading" ? disabled : false}
                  name="password"
                  type="password"
                  placeholder={t("Password")}
                  onChange={handleChange}
                  value={contact.password}
                />

                <ReCAPTCHA
                  ref={captchaRef}
                  style={{
                    transform: "scale(0.893)",
                    WebkitTransform: "scale(0.893)",
                    transformOrigin: "0 0",
                    WebkitTransformOrigin: "0 0"
                  }}
                  sitekey={process.env.REACT_APP_ReCaptchaKey}
                  onChange={onReCAPTCHAChange}
                  onExpired={onReCAPTCHAExpired}
                />

                <div className={`login ${disabled === "disabled" ? "loading" : loading}`}>
                  <button disabled={disabled}>{t("Login")}</button>
                </div>
                <br />
                {/* Google 登录按钮已被禁用，如果要开启，删除注释符号以及外的一对大括号
                                <div className="other-login">
                                    <button onClick={logGoogleUser} type="button" disabled={disabled} ><p className="fa fa-google ">  </p>  Login with google</button>
                                </div>
                                */}
                {/* 记住我复选框 */}
                <div style={{ display: "flex", justifyContent: "center", lineHeight: 0 }}>
                  <label style={{ display: "flex", alignItems: "center", marginLeft: "0px" }}>
                    <input
                      style={{ width: "12px", boxSizing: "content-box", padding: "0px", margin: 0 }}
                      type="checkbox"
                      name="rememberMe"
                      checked={contact.rememberMe}
                      onChange={handleRememberMeChange}
                    />
                    <p style={{ color: "#888", fontFamily: "Arial, sans-serif", fontSize: "14px", marginLeft: "5px" }}>{t("#Automatic login option")} </p>
                  </label>
                </div>
                <p className="Loginmessage">
                  {t("Not registered?")}{" "}
                  <Link to="/signup">
                    {t("Create an account")}
                  </Link>
                </p>

              </div>
            </form>
          </div>
        </div>
      </div >
    </AnimatedPage >
  );
}
export default Login;
