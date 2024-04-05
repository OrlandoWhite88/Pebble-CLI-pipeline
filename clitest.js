#!/usr/bin/env node

import * as p from '@clack/prompts';
import { setTimeout } from 'node:timers/promises';
import color from 'picocolors';
import fs from 'fs';
import path from 'path';

async function selectFile(message) {
  const files = fs.readdirSync(process.cwd()).filter((file) => fs.statSync(file).isFile());

  const selectedFile = await p.select({
    message,
    options: files.map((file) => ({ value: file, label: file })),
  });

  return selectedFile;
}

async function trainingFlow() {
  const framework = await p.select({
    message: 'Select the framework:',
    options: [
      { value: 'pytorch', label: 'PyTorch' },
      { value: 'tensorflow', label: 'TensorFlow' },
      { value: 'xgboost', label: 'XGBoost' },
      { value: 'sklearn', label: 'scikit-learn' },
    ],
  });

  const trainingScript = await selectFile('Select the training script:');

  const dockerfile = await selectFile('Select the Dockerfile:');

  let resourceRequirements = await p.select({
    message: 'Select resource requirements:',
    options: [
      { value: 'distributed', label: 'Distributed training across our network', hint: 'Lowest price. Greatest scalability. Recommended.' },
      { value: 'gpu', label: 'Select GPU instance' },
    ],
  });

  let trainingPrice = 0;
  let gpuType = '';
  let vram = 0;
  let gpuInstance = '';
  let cpuCores = 0;
  let ram = 0;
  let modelParameters = 0;
  let trainingExamples = 0;
  let epochs = 0;

  while (true) {
    if (resourceRequirements === 'distributed') {
      modelParameters = await p.text({
        message: 'Enter the number of model parameters:',
        placeholder: 'e.g. 5000 parameters',
        validate: (value) => {
          if (!/^\d+$/.test(value)) return 'Invalid input! Please enter a positive integer.';
          if (Number(value) <= 0) return 'Number of model parameters must be greater than 0!';
        },
      });

      trainingExamples = await p.text({
        message: 'Enter the number of training examples (specify training examples in full dataset):',
        placeholder: 'e.g. 250 examples',
        validate: (value) => {
          if (!/^\d+$/.test(value)) return 'Invalid input! Please enter a positive integer.';
          if (Number(value) <= 0) return 'Number of training examples must be greater than 0!';
        },
      });

      epochs = await p.text({
        message: 'Enter the number of epochs:',
        placeholder: 'e.g. 10 epochs',
        validate: (value) => {
          if (!/^\d+$/.test(value)) return 'Invalid input! Please enter a positive integer.';
          if (Number(value) <= 0) return 'Number of epochs must be greater than 0!';
        },
      });

      gpuType = await p.select({
        message: 'Select GPU type (leave default for automatic selection):',
        options: [
          { value: 'default', label: 'Default' },
          { value: 'high', label: 'High-powered', hint: 'Recommended for highest compute throughput.' },
        ],
      });

      const specifyVRAM = await p.confirm({
        message: 'Do you want to specify minimum VRAM?',
        initialValue: false,
      });

      if (specifyVRAM) {
        vram = await p.text({
          message: 'Enter the minimum amount of VRAM (e.g., 16GB):',
          placeholder: 'e.g. 16',
          validate: (value) => {
            if (value.length === 0) return 'VRAM amount is required!';
          },
        });
      }

      // Calculate training price based on the formula: compute = 2 × # of connections × 3 × # of training examples × # of epochs
      const flops = 2 * Number(modelParameters) * 3 * Number(trainingExamples) * Number(epochs);
      const tflops = flops / 1e12; // Convert FLOPs to TFLOPs
      const pricePerTFLOP = 0.004; // Placeholder price per TFLOP
      trainingPrice = tflops * pricePerTFLOP;
    } else if (resourceRequirements === 'gpu') {
      gpuInstance = await p.select({
        message: 'Select a specific GPU instance from the list:',
        options: [
          { value: 'a100', label: 'NVIDIA A100', hint: 'Price: $10 per hour' },
          { value: 'a6000', label: 'NVIDIA A6000', hint: 'Price: $8 per hour' },
          { value: 'rtx4090', label: 'NVIDIA RTX 4090', hint: 'Price: $6 per hour' },
          { value: 'h100', label: 'NVIDIA H100', hint: 'Price: $15 per hour' },
        ],
      });

      cpuCores = await p.text({
        message: 'Enter the number of CPU cores:',
        placeholder: '8',
        validate: (value) => {
          if (!/^\d+$/.test(value)) return 'Invalid input! Please enter a positive integer.';
          if (Number(value) <= 0) return 'Number of CPU cores must be greater than 0!';
        },
      });

      ram = await p.text({
        message: 'Enter the amount of RAM (e.g., 64GB):',
        placeholder: '64GB',
        validate: (value) => {
          if (value.length === 0) return 'RAM amount is required!';
        },
      });
    }

    // Display a summary of the selected options and the estimated price
    console.log(color.bold('Selected options:'));
    console.log('- Framework:', color.cyan(framework));
    console.log('- Training script:', color.cyan(trainingScript));
    console.log('- Dockerfile:', color.cyan(dockerfile));
    console.log('- Resource requirements:', color.cyan(resourceRequirements));
    if (resourceRequirements === 'distributed') {
      console.log('- Model parameters:', color.yellow(modelParameters));
      console.log('- Training examples:', color.yellow(trainingExamples));
      console.log('- Epochs:', color.yellow(epochs));
      console.log('  - GPU type:', color.magenta(gpuType));
      console.log('  - Minimum VRAM:', color.magenta(vram || 'Not specified'));
      console.log('Estimated training price: ' + color.green('$' + trainingPrice.toFixed(12)));
    } else if (resourceRequirements === 'gpu') {
      console.log('  - GPU instance:', color.magenta(gpuInstance));
      console.log('  - CPU cores:', color.magenta(cpuCores));
      console.log('  - RAM:', color.magenta(ram));
    }

    const confirmOptions = await p.select({
      message: 'Review the options and proceed:',
      options: [
        { value: 'proceed', label: 'Proceed' },
        { value: 'editDistributed', label: 'Edit distributed training options' },
        { value: 'switchToGpu', label: 'Switch to GPU instance' },
      ],
    });

    if (confirmOptions === 'proceed') {
      break;
    } else if (confirmOptions === 'editDistributed') {
      resourceRequirements = 'distributed';
    } else if (confirmOptions === 'switchToGpu') {
      resourceRequirements = 'gpu';
    }
  }

  // Start the training job or boot the instance
  if (resourceRequirements === 'distributed') {
    p.outro(`${color.bgMagenta(color.black(' Training job started! '))}`);
  } else if (resourceRequirements === 'gpu') {
    p.outro(`${color.bgMagenta(color.black(' GPU instance booting... '))}`);
  }
}

async function deploymentFlow() {
  // Implement the deployment flow here
  p.outro(`${color.bgMagenta(color.black(' Deployment flow not implemented yet. '))}`);
}

async function main() {
  console.clear();

  p.intro(`${color.bgMagenta(color.black(' Welcome to the Pebble CLI! '))}`);

  const option = await p.select({
    message: 'Select an option:',
    options: [
      { value: 'training', label: 'Training' },
      { value: 'deployment', label: 'Deployment' },
    ],
  });

  try {
    if (option === 'training') {
      await trainingFlow();
    } else if (option === 'deployment') {
      await deploymentFlow();
    }
  } catch (error) {
    if (p.isCancel(error)) {
      p.cancel('Operation cancelled.');
    } else {
      console.error('An error occurred:', error);
    }
  }
}

main().catch(console.error);