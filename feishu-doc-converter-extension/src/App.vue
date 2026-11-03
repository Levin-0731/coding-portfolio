<!-- src/App.vue -->
<template>
  <!-- <el-container class="app-container"> -->
  <FeishuView />
  <!-- </el-container> -->
</template>

<script setup>
import FeishuView from "@/views/FeishuView.vue";
</script>

<style lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app,
.app-container {
  min-height: 100vh;
  width: 100vw;
  background: #f5f5f5;

  .hidden-container {
    position: absolute;
    left: -9999px;

    .fs-image-wrapper {
      resize: none !important;
    }
    // visibility: hidden;
  }
}
</style>
