# **ISSUE LOGS**

### 

### **Screen Time Mismatch - RESOLVED**

#### **Potential Reasons -** 

1. **Double fetch and storage of usage logs - Check the fetch function, and if there is a double call anywhere**
2. **There is an actual issue with the UsageStatsManager API**
3. **Maybe the getScreenTimeData and getAppUsageData functions are getting mixed?**



#### **Issue Identified -** 

1. **The screen time total also includes the time of system apps, like notification banners, app launchers, etc., which don't actually count as user screen time, and neither does digital wellbeing count them while showing total screen time. As we include those also in the total screen time calculation, it thus leads to a larger value than the one shown by digital wellbeing.**
2. **Fix - Add PackageManager to identify apps as system app with flags, and sort accordingly while addition**
3. **Another improvement - Simply remove entries beforehand if total usage time is 0**







#### **Microsoft Integration Issue -** 

##### **Potential Reasons -** 

1. **Just check that any calls to Microsoft links or callbacks don't have localhost, which can cause network issues over the internet**
